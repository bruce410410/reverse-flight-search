import type { AppEnv } from "../config/env.js";
import type { ReverseSearchQuery, FlightOffer } from "../types/flight.js";
import { resolveCandidateOrigins, type CandidateOriginAirport } from "./candidateOrigins.js";
import { mapDuffelOfferToFlightOffer, buildCandidateOrigins } from "./mapper.js";
import type { RawDuffelErrorResponse, RawDuffelOfferRequestResponse } from "./types.js";
import {
  DuffelAllOriginsFailedError,
  DuffelHttpError,
  DuffelNetworkError,
  DuffelRateLimitError,
  DuffelTimeoutError,
} from "./errors.js";

/**
 * Duffel API client，專門用於「反向搜票」查詢，目前接的是 Duffel 的
 * **測試模式**（Duffel Airways，航空公司代碼 ZZ）。
 *
 * === 為什麼從 Travelpayouts 改用 Duffel ===
 *
 * 使用者實際走過 Travelpayouts 的申請流程後發現：拿到 API token 前必須先讓
 * Travelpayouts 的「Drive」廣告外掛在自己的網站上通過即時驗證，不是單純的
 * 帳號設定。這個外掛的行為（動態載入第三方程式碼、抓整頁 HTML 快照、
 * 用反偵測手法隱藏自己對瀏覽器原生 API 的修改）超出了使用者願意接受的範圍。
 * Duffel 的測試模式帳號是純自助註冊、不需要安裝任何東西在任何網站上，
 * 因此改用它先把整個系統的資料流跑起來測試。
 *
 * === 測試模式資料的定位 ===
 *
 * Duffel Airways 回傳的是「結構正確、但時刻表與價格都是隨機產生」的假資料
 * ——跟 Travelpayouts（結構較簡陋，但至少是真實市場資料）剛好相反。這代表
 * 現在系統跑起來看到的候選出發地、價格、班次，全部都是假的，只是用來驗證
 * 整條資料流（快取分級、AeroDataBox 校驗、前端渲染）能不能正常運作。
 * 之後如果要換回真實資料源，`ReverseSearchService` 完全不用改——只要
 * 再寫一個符合 `FlightSearchClient` 介面（回傳 `FlightOffer[]`）的 client，
 * 在 server.ts 換掉這裡的 wiring 即可，Travelpayouts 版本的實作也還留著
 * （見 travelpayouts/ 目錄），沒有被刪除。
 *
 * === 為什麼還是「對每個候選出發地平行打一次請求」 ===
 *
 * Duffel 的 offer_requests 端點一樣只接受單一 origin/destination 配對
 * （用 slices 陣列表達行程，不支援「多個出發地」語法），沿用跟 Travelpayouts
 * 版本相同的候選出發地策略。
 *
 * === 日期範圍的簡化處理 ===
 *
 * Duffel 的 slice 只接受單一 departure_date，不像 Travelpayouts 有「整個月」
 * 的概念。考慮到這裡本來就是測試資料、不是真實報價，直接固定用查詢區間的
 * 第一天（dateFrom / returnDateFrom）當作查詢日期，不逐日或逐月列舉——
 * 這是刻意的簡化，真實資料源（Travelpayouts 或其他）才需要對日期範圍
 * 做更精確的處理。
 */
export class DuffelClient {
  constructor(private readonly env: AppEnv) {}

  async searchReverseFlights(query: ReverseSearchQuery): Promise<FlightOffer[]> {
    if (!this.env.DUFFEL_API_TOKEN) {
      throw new DuffelHttpError(401, "尚未設定 DUFFEL_API_TOKEN，無法呼叫 Duffel API");
    }

    const candidateOrigins = resolveCandidateOrigins(this.env.DUFFEL_CANDIDATE_ORIGINS).filter(
      (airport) => airport.iata !== query.destination,
    );

    const settled = await Promise.allSettled(candidateOrigins.map((origin) => this.fetchOneOrigin(origin, query)));

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
      throw new DuffelAllOriginsFailedError(failures);
    }

    return buildCandidateOrigins(offers, query.maxResults);
  }

  private async fetchOneOrigin(origin: CandidateOriginAirport, query: ReverseSearchQuery): Promise<FlightOffer[]> {
    const slices: Array<{ origin: string; destination: string; departure_date: string }> = [
      { origin: origin.iata, destination: query.destination, departure_date: query.dateFrom },
    ];

    if (query.tripType === "round-trip" && query.returnDateFrom) {
      slices.push({
        origin: query.destination,
        destination: origin.iata,
        departure_date: query.returnDateFrom,
      });
    }

    const body = {
      data: {
        slices,
        passengers: [{ type: "adult" }],
        cabin_class: "economy",
      },
    };

    const url = `${this.env.DUFFEL_API_BASE_URL}/air/offer_requests?return_offers=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.DUFFEL_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.env.DUFFEL_API_TOKEN}`,
          "duffel-version": "v2",
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new DuffelTimeoutError(this.env.DUFFEL_REQUEST_TIMEOUT_MS);
      }
      throw new DuffelNetworkError(`無法連線到 Duffel API（origin=${origin.iata}）`, err);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429) {
      const resetHeader = response.headers.get("ratelimit-reset");
      const retryAfterSeconds = resetHeader ? secondsUntil(resetHeader) : null;
      throw new DuffelRateLimitError(retryAfterSeconds);
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as RawDuffelErrorResponse;
      const message = errorBody.errors?.[0]?.message ?? errorBody.errors?.[0]?.title ?? response.statusText;
      throw new DuffelHttpError(response.status, `origin=${origin.iata} ${message}`);
    }

    const parsed = (await response.json()) as RawDuffelOfferRequestResponse;
    const rawOffers = parsed.data?.offers ?? [];

    return rawOffers.map((offer) => mapDuffelOfferToFlightOffer(offer, origin, query.destination));
  }
}

/** 把 Duffel 的 ratelimit-reset（RFC 2616 日期格式）轉成「距現在還有幾秒」。 */
function secondsUntil(httpDate: string): number | null {
  const target = Date.parse(httpDate);
  if (Number.isNaN(target)) return null;
  const seconds = Math.ceil((target - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}
