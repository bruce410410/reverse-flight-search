import type { Redis } from "ioredis";
import type { AppEnv } from "../config/env.js";
import type { ReverseSearchQuery, FlightOffer } from "../types/flight.js";
import { resolveCandidateOrigins, type CandidateOriginAirport } from "./candidateOrigins.js";
import { mapSkyscrapperItineraryToFlightOffer, buildCandidateOrigins } from "./mapper.js";
import { SkyscrapperEntityResolver } from "./entityResolver.js";
import type { RawSkyscrapperSearchFlightsResponse } from "./types.js";
import {
  SkyscrapperAllOriginsFailedError,
  SkyscrapperApiError,
  SkyscrapperHttpError,
  SkyscrapperNetworkError,
  SkyscrapperRateLimitError,
  SkyscrapperTimeoutError,
} from "./errors.js";

/**
 * Sky-scrapper（RapidAPI，非官方 Skyscanner 資料查詢 API）client，
 * 反向搜票的第三個資料源實作（Kiwi → Travelpayouts → Duffel → Sky-scrapper，
 * 完整歷史見 README「資料來源」）。
 *
 * === 為什麼從 Duffel 換成 Sky-scrapper ===
 *
 * Duffel 測試模式本身沒有問題（純自助註冊、不用安裝任何東西），但使用者接下來
 * 想申請真實資料的正式帳號時，發現 Duffel 的註冊表單強制要求「Company name」
 * 與「Country of incorporation」，且國家下拉選單只列了約 30 個歐美/加拿大/
 * 墨西哥的司法管轄區，整個亞洲（包含台灣）都不在清單裡——不是「沒有台灣選項
 * 所以要選別的」這麼簡單，是個人開發者、或公司不在那份清單裡的人，根本填不完
 * 這張表單。改用 Sky-scrapper 是因為它掛在 RapidAPI 平台上，而這個專案本來就
 * 已經在用 RapidAPI 申請 AeroDataBox 了——RapidAPI 帳號註冊只需要 email/password，
 * 沒有公司或國家欄位這種限制。
 *
 * === 資料是真是假 ===
 *
 * 跟 Duffel 測試模式（固定假航空公司、隨機資料）不同，Sky-scrapper 抓的是
 * Skyscanner 網站的真實公開資料，是這三次資料源改版以來第一次同時滿足
 * 「免費」「個人開發者友善」「真實資料」三個條件的方案。代價是它是非官方、
 * 社群維護的 API，沒有 SLA 保證，也沒有官方 schema 文件——不過 2026-09-22
 * 使用者用自己申請到的真實金鑰實際打過一次 searchFlights，回應驗證了
 * segment 層級的航班班號欄位（`flightNumber`、`marketingCarrier.alternateId`）
 * 假設是正確的，見 types.ts / mapper.ts 檔頭註解。
 *
 * === 免費額度很緊，所以候選出發地清單縮小成 6 個 ===
 *
 * RapidAPI 的 BASIC（免費）方案每月實際上只有 **50 次**呼叫（一開始從第三方
 * 部落格文章查到的「100 次」是錯的，2026-09-22 用真實請求的
 * `x-ratelimit-requests-limit` header 校正過）。反向搜尋是「每個候選出發地
 * 平行查一次」的 fan-out 設計，這點跟 Travelpayouts/Duffel 版本一樣（Sky-scrapper
 * 的 searchFlights 端點同樣只接受單一 origin/destination 配對，沒有多地點語法）。
 * 跟使用者確認「縮小候選清單」的取捨、並依真實額度數字重新校準後，把候選出發地
 * 清單從 28 個縮到 **6 個**（見 candidateOrigins.ts），讓每月大約能完整搜尋
 * 7-8 次。機場代碼解析成 skyId/entityId 的結果會被永久快取在 Redis
 * （見 entityResolver.ts），所以只有每個機場「第一次」被查詢時比較貴，
 * 之後單次搜尋大致就是「候選機場數」次呼叫。
 *
 * === 日期範圍的簡化處理 ===
 *
 * searchFlights 的 date 參數只接受單一日期，不像 Travelpayouts 有「整個月」
 * 的概念。沿用跟 Duffel 版本相同的簡化：固定用查詢區間的第一天
 * （dateFrom / returnDateFrom）當作查詢日期，不逐日或逐月列舉——這裡雖然是
 * 真實資料，但免費額度太緊，沒有本錢為了更精確的日期覆蓋率去多打額外請求。
 *
 * === 保留 Duffel／Travelpayouts 模組 ===
 *
 * 兩個都完整保留未刪除，只是 server.ts 不再 wiring。三者都符合同一個
 * `FlightSearchClient` 介面，之後想換回任何一個都只要改 server.ts 一行。
 */
export class SkyscrapperClient {
  private readonly entityResolver: SkyscrapperEntityResolver;

  constructor(
    private readonly env: AppEnv,
    redis: Redis,
  ) {
    this.entityResolver = new SkyscrapperEntityResolver(env, redis);
  }

  async searchReverseFlights(query: ReverseSearchQuery): Promise<FlightOffer[]> {
    if (!this.env.SKYSCRAPPER_API_KEY) {
      throw new SkyscrapperHttpError(401, "尚未設定 SKYSCRAPPER_API_KEY，無法呼叫 Sky-scrapper API");
    }

    const candidateOrigins = resolveCandidateOrigins(this.env.SKYSCRAPPER_CANDIDATE_ORIGINS).filter(
      (airport) => airport.iata !== query.destination,
    );

    // 目的地的 skyId/entityId 對所有候選出發地都一樣，只解析一次、共用結果，
    // 避免每個候選出發地都各自重複解析同一個目的地機場、白白多燒額度。
    let destinationEntity;
    try {
      destinationEntity = await this.entityResolver.resolve(query.destination);
    } catch (err) {
      throw wrapAsAllOriginsFailed(err, candidateOrigins.length);
    }

    const settled = await Promise.allSettled(
      candidateOrigins.map((origin) => this.fetchOneOrigin(origin, destinationEntity, query)),
    );

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
      throw new SkyscrapperAllOriginsFailedError(failures);
    }

    return buildCandidateOrigins(offers, query.maxResults);
  }

  private async fetchOneOrigin(
    origin: CandidateOriginAirport,
    destinationEntity: { skyId: string; entityId: string },
    query: ReverseSearchQuery,
  ): Promise<FlightOffer[]> {
    const originEntity = await this.entityResolver.resolve(origin.iata);

    const params = new URLSearchParams({
      originSkyId: originEntity.skyId,
      destinationSkyId: destinationEntity.skyId,
      originEntityId: originEntity.entityId,
      destinationEntityId: destinationEntity.entityId,
      date: query.dateFrom,
      adults: "1",
      currency: query.currency,
      market: this.env.SKYSCRAPPER_MARKET,
      countryCode: this.env.SKYSCRAPPER_COUNTRY_CODE,
    });

    if (query.tripType === "round-trip" && query.returnDateFrom) {
      params.set("returnDate", query.returnDateFrom);
    }

    const url = `${this.env.SKYSCRAPPER_API_BASE_URL}/api/v1/flights/searchFlights?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.SKYSCRAPPER_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "x-rapidapi-key": this.env.SKYSCRAPPER_API_KEY,
          "x-rapidapi-host": this.env.SKYSCRAPPER_API_HOST,
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new SkyscrapperTimeoutError(this.env.SKYSCRAPPER_REQUEST_TIMEOUT_MS);
      }
      throw new SkyscrapperNetworkError(`無法連線到 Sky-scrapper API（origin=${origin.iata}）`, err);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429) {
      throw new SkyscrapperRateLimitError(readRetryAfterSeconds(response));
    }

    if (!response.ok) {
      throw new SkyscrapperHttpError(response.status, `origin=${origin.iata} ${response.statusText}`);
    }

    const parsed = (await response.json()) as RawSkyscrapperSearchFlightsResponse;
    const itineraries = parsed.data?.itineraries ?? [];

    return itineraries
      .map((itinerary) => mapSkyscrapperItineraryToFlightOffer(itinerary, origin, query.destination))
      .filter((offer): offer is FlightOffer => offer !== null)
      .map((offer) => ({ ...offer, currency: query.currency }));
  }
}

function readRetryAfterSeconds(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) return seconds;
  }
  const resetHeader = response.headers.get("x-ratelimit-requests-reset");
  if (resetHeader) {
    const seconds = Number.parseInt(resetHeader, 10);
    if (!Number.isNaN(seconds)) return seconds;
  }
  return null;
}

/** 目的地解析失敗時，所有候選出發地必然也都查不成，直接視同「全部失敗」。 */
function wrapAsAllOriginsFailed(err: unknown, originCount: number): SkyscrapperApiError {
  const causes = new Array(Math.max(originCount, 1)).fill(err);
  return new SkyscrapperAllOriginsFailedError(causes);
}
