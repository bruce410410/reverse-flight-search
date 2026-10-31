import type { AppEnv } from "../config/env.js";
import type { ReverseSearchQuery, FlightOffer } from "../types/flight.js";
import { resolveCandidateOrigins, type CandidateOriginAirport } from "./candidateOrigins.js";
import { enumerateMonths, isDateWithinRange } from "./dateUtil.js";
import { mapTravelpayoutsEntryToOffer, buildCandidateOrigins } from "./mapper.js";
import type { RawTravelpayoutsCheapResponse, RawTravelpayoutsOfferEntry } from "./types.js";
import {
  TravelpayoutsAllOriginsFailedError,
  TravelpayoutsHttpError,
  TravelpayoutsNetworkError,
  TravelpayoutsRateLimitError,
  TravelpayoutsTimeoutError,
} from "./errors.js";

/**
 * Travelpayouts（Aviasales）Data API client，專門用於「反向搜票」查詢。
 *
 * === 為什麼是「對每個候選出發地平行打一次請求」而不是一次查全部 ===
 *
 * `/v1/prices/cheap` 的 origin 參數官方文件明確要求單一 IATA 城市代碼
 * （見 candidateOrigins.ts 檔頭註解），沒有 Kiwi 那種「逗號分隔多地點」的用法。
 * 因此「目的地反查、涵蓋全球候選出發地」這個核心需求，改成用
 * candidateOrigins.ts 裡整理好的代表性機場清單，對每一個機場（以及日期範圍
 * 涵蓋的每個月份）各打一次請求，平行送出後在這裡彙整。
 *
 * === 容錯設計 ===
 *
 * 單一候選出發地（或單一月份）查詢失敗，不該讓整個反向搜尋失敗——使用者
 * 還是想看到「查得到的那些出發地」，而不是因為某一個出發地查詢逾時就整頁空白。
 * 只有「全部候選出發地都查詢失敗」時，才拋出 TravelpayoutsAllOriginsFailedError，
 * 讓 ReverseSearchService 既有的「Live API 失敗時降級用舊快取」邏輯接手。
 */
export class TravelpayoutsClient {
  constructor(private readonly env: AppEnv) {}

  async searchReverseFlights(query: ReverseSearchQuery): Promise<FlightOffer[]> {
    if (!this.env.TRAVELPAYOUTS_API_TOKEN) {
      throw new TravelpayoutsHttpError(401, "尚未設定 TRAVELPAYOUTS_API_TOKEN，無法呼叫 Travelpayouts Data API");
    }

    const candidateOrigins = resolveCandidateOrigins(this.env.TRAVELPAYOUTS_CANDIDATE_ORIGINS).filter(
      (airport) => airport.iata !== query.destination,
    );

    const departMonths = enumerateMonths(query.dateFrom, query.dateTo);

    const tasks: Array<Promise<FlightOffer[]>> = [];
    for (const origin of candidateOrigins) {
      for (const month of departMonths) {
        tasks.push(this.fetchOneOriginMonth(origin, month, query));
      }
    }

    const settled = await Promise.allSettled(tasks);

    const offers: FlightOffer[] = [];
    const failures: unknown[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        offers.push(...result.value);
      } else {
        failures.push(result.reason);
      }
    }

    if (offers.length === 0 && failures.length > 0 && failures.length === settled.length) {
      throw new TravelpayoutsAllOriginsFailedError(failures);
    }

    return buildCandidateOrigins(offers, query.maxResults);
  }

  private async fetchOneOriginMonth(
    origin: CandidateOriginAirport,
    departMonth: string,
    query: ReverseSearchQuery,
  ): Promise<FlightOffer[]> {
    const params = new URLSearchParams({
      origin: origin.iata,
      destination: query.destination,
      depart_date: departMonth,
      currency: query.currency,
      token: this.env.TRAVELPAYOUTS_API_TOKEN,
    });

    if (query.tripType === "round-trip" && query.returnDateFrom) {
      params.set("return_date", query.returnDateFrom.slice(0, 7));
    }

    const url = `${this.env.TRAVELPAYOUTS_API_BASE_URL}/v1/prices/cheap?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.TRAVELPAYOUTS_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "x-access-token": this.env.TRAVELPAYOUTS_API_TOKEN,
          accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new TravelpayoutsTimeoutError(this.env.TRAVELPAYOUTS_REQUEST_TIMEOUT_MS);
      }
      throw new TravelpayoutsNetworkError(`無法連線到 Travelpayouts Data API（origin=${origin.iata}）`, err);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : null;
      throw new TravelpayoutsRateLimitError(Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds);
    }

    if (!response.ok) {
      throw new TravelpayoutsHttpError(response.status, `origin=${origin.iata} ${response.statusText}`);
    }

    const body = (await response.json()) as RawTravelpayoutsCheapResponse;
    if (!body.success || !body.data) {
      // API 回報成功但這個出發地/月份沒有資料，屬於正常情況（不是錯誤），回傳空陣列即可。
      return [];
    }

    const entriesForDestination = body.data[query.destination];
    if (!entriesForDestination) return [];

    const rawEntries: RawTravelpayoutsOfferEntry[] = Object.values(entriesForDestination);

    return rawEntries
      .filter((entry) => isDateWithinRange(entry.departure_at, query.dateFrom, query.dateTo))
      .filter((entry) =>
        query.tripType === "round-trip" && query.returnDateFrom && query.returnDateTo
          ? entry.return_at !== undefined &&
            isDateWithinRange(entry.return_at, query.returnDateFrom, query.returnDateTo)
          : true,
      )
      .map((entry) => mapTravelpayoutsEntryToOffer(entry, origin, query.destination, query.currency));
  }
}
