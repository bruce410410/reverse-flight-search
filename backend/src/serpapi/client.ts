import type { AppEnv } from "../config/env.js";
import type { ReverseSearchQuery, FlightOffer } from "../types/flight.js";
import { chunkOrigins, resolveCandidateOrigins, type CandidateOriginAirport } from "./candidateOrigins.js";
import { buildCandidateOrigins, mapSerpApiItineraryToFlightOffer } from "./mapper.js";
import type { RawSerpApiSearchResponse } from "./types.js";
import {
  SerpApiAllBatchesFailedError,
  SerpApiHttpError,
  SerpApiNetworkError,
  SerpApiRateLimitError,
  SerpApiTimeoutError,
} from "./errors.js";

/**
 * SerpApi Google Flights client，反向搜票的第四個資料源實作
 * （Kiwi → Travelpayouts → Duffel → Sky-scrapper → SerpApi，完整歷史見 README「資料來源」）。
 *
 * === 為什麼從 Sky-scrapper 換成 SerpApi ===
 *
 * Sky-scrapper 免費方案每月只有 50 次，而且 searchFlights 一次只接受一個出發地，
 * 6 個候選機場一次搜尋就要 6 次呼叫。SerpApi 免費方案每月 250 次成功搜尋
 * （快取命中、失敗的請求不扣額度），資料直接來自 Google Flights，而且
 * `departure_id` 接受逗號分隔的多個機場，一次請求就能查一整批出發地。
 *
 * === 批次查詢 ===
 *
 * Google Flights 一個機場欄位最多 7 個機場，所以候選清單切成每批
 * SERPAPI_MAX_ORIGINS_PER_REQUEST 個、每批平行打一次請求，再把結果依
 * 第一段航班的出發機場歸回各候選出發地、每個出發地取最便宜一筆。
 * 注意 Google 對多機場查詢只回傳它認為最好的一批結果，不保證每個候選出發地
 * 都會出現在結果裡——這是用額度換覆蓋率的取捨。
 *
 * === 日期 ===
 *
 * 跟 Sky-scrapper 版本一樣，固定用查詢區間第一天（dateFrom / returnDateFrom）。
 * 來回票（type=1）回傳的是去程選項，price 是來回總價。
 */
export class SerpApiClient {
  constructor(private readonly env: AppEnv) {}

  async searchReverseFlights(query: ReverseSearchQuery): Promise<FlightOffer[]> {
    if (!this.env.SERPAPI_API_KEY) {
      throw new SerpApiHttpError(401, "尚未設定 SERPAPI_API_KEY，無法呼叫 SerpApi");
    }

    const candidateOrigins = resolveCandidateOrigins(this.env.SERPAPI_CANDIDATE_ORIGINS).filter(
      (airport) => airport.iata !== query.destination,
    );
    const batches = chunkOrigins(candidateOrigins, this.env.SERPAPI_MAX_ORIGINS_PER_REQUEST);

    const settled = await Promise.allSettled(batches.map((batch) => this.fetchBatch(batch, query)));

    const offers: FlightOffer[] = [];
    const failures: unknown[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        offers.push(...result.value);
      } else {
        failures.push(result.reason);
      }
    }

    if (failures.length > 0 && failures.length === settled.length) {
      // 全部批次都是額度用盡時，直接把 429 往上拋，讓路由回 429 而不是籠統的 502。
      const rateLimit = failures.find((f): f is SerpApiRateLimitError => f instanceof SerpApiRateLimitError);
      if (rateLimit && failures.every((f) => f instanceof SerpApiRateLimitError)) throw rateLimit;
      throw new SerpApiAllBatchesFailedError(failures);
    }

    return buildCandidateOrigins(offers, query.maxResults);
  }

  private async fetchBatch(batch: CandidateOriginAirport[], query: ReverseSearchQuery): Promise<FlightOffer[]> {
    const isRoundTrip = query.tripType === "round-trip" && !!query.returnDateFrom;
    const params = new URLSearchParams({
      engine: "google_flights",
      departure_id: batch.map((a) => a.iata).join(","),
      arrival_id: query.destination,
      outbound_date: query.dateFrom,
      type: isRoundTrip ? "1" : "2",
      currency: query.currency,
      hl: this.env.SERPAPI_HL,
      gl: this.env.SERPAPI_GL,
      adults: "1",
      api_key: this.env.SERPAPI_API_KEY,
    });
    if (isRoundTrip) params.set("return_date", query.returnDateFrom!);

    const url = `${this.env.SERPAPI_API_BASE_URL}/search.json?${params.toString()}`;
    const batchLabel = batch.map((a) => a.iata).join(",");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.SERPAPI_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new SerpApiTimeoutError(this.env.SERPAPI_REQUEST_TIMEOUT_MS);
      }
      throw new SerpApiNetworkError(`無法連線到 SerpApi（origins=${batchLabel}）`, err);
    } finally {
      clearTimeout(timeout);
    }

    const body = (await response.json().catch(() => ({}))) as RawSerpApiSearchResponse;

    if (response.status === 429) {
      throw new SerpApiRateLimitError(readRetryAfterSeconds(response), body.error);
    }
    if (!response.ok) {
      throw new SerpApiHttpError(response.status, body.error ?? `origins=${batchLabel} ${response.statusText}`);
    }
    if (body.error) {
      // 「查無結果」SerpApi 也是用 error 欄位回報，這不是錯誤，視為這批沒有航班。
      if (/hasn't returned any results|no results/i.test(body.error)) return [];
      throw new SerpApiHttpError(response.status, body.error);
    }

    const originsByIata = new Map(batch.map((a) => [a.iata, a]));
    const deepLink = body.search_metadata?.google_flights_url;
    const itineraries = [...(body.best_flights ?? []), ...(body.other_flights ?? [])];

    return itineraries
      .map((itinerary) => mapSerpApiItineraryToFlightOffer(itinerary, originsByIata, query.currency, deepLink))
      .filter((offer): offer is FlightOffer => offer !== null);
  }
}

function readRetryAfterSeconds(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return null;
  const seconds = Number.parseInt(retryAfter, 10);
  return Number.isNaN(seconds) ? null : seconds;
}
