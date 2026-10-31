import { buildReverseSearchCacheKey, CacheStore, type CacheEntry } from "../cache/cacheStore.js";
import { buildStaleNotice, classifyFreshness } from "../cache/freshness.js";
import type {
  CacheMeta,
  FlightOffer,
  FreshnessTier,
  ResultSource,
  ReverseSearchQuery,
  ReverseSearchResult,
} from "../types/flight.js";

export interface ReverseSearchLogger {
  warn: (msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * ReverseSearchService 對「查票資料源」的最小依賴介面，故意不直接依賴任何具體
 * provider（Travelpayouts、Duffel 等）的 client 型別。
 *
 * 這個專案已經換過一次資料源（Kiwi → Travelpayouts → Duffel，見 README「資料來源」
 * 一節的完整歷史），每次都證實「provider 的原始回應格式」不該外洩到這一層——
 * 只要 client 端保證回傳排序好、去重好的 FlightOffer[]，service 端完全不用改。
 */
export interface FlightSearchClient {
  searchReverseFlights(query: ReverseSearchQuery): Promise<FlightOffer[]>;
}

/**
 * ReverseSearchService 對「即時航班狀態校驗」的最小依賴介面。
 * 用介面而不是直接依賴 FlightValidationService 類別，避免 search/ 與 adb/ 兩個模組
 * 互相耦合太深；預設的 no-op 實作讓沒有設定 AeroDataBox 的環境（或既有測試）
 * 完全不受影響地繼續運作。
 */
export interface FlightValidator {
  validateTopOffers(offers: FlightOffer[], now?: Date): Promise<FlightOffer[]>;
}

const noopLogger: ReverseSearchLogger = { warn: () => {} };
const noopFlightValidator: FlightValidator = {
  validateTopOffers: async (offers) => offers,
};

/**
 * 反向搜票核心服務：整合「4 層快取鮮度判斷」與「Travelpayouts 即時查詢」，
 * 決定每一次查詢究竟該直接用快取、附提示用快取、強迫先校驗、還是整個捨棄重查。
 *
 * 設計原則：
 *  - Redis 不可用時不讓查詢整個失敗——退化為每次都直接查 Live API（並記錄警告）。
 *  - Travelpayouts API 在「必須校驗」或「捨棄重查」情境下失敗時，若手上還有舊快取，
 *    寧可回傳「標記為可能過時」的結果，也不要讓使用者拿到空白或錯誤頁面；
 *    真正沒有任何快取可退可退時，才把錯誤往上拋。
 */
export class ReverseSearchService {
  constructor(
    private readonly cacheStore: CacheStore,
    private readonly searchClient: FlightSearchClient,
    private readonly logger: ReverseSearchLogger = noopLogger,
    private readonly flightValidator: FlightValidator = noopFlightValidator,
  ) {}

  async search(query: ReverseSearchQuery, now: Date = new Date()): Promise<ReverseSearchResult> {
    const cacheKey = buildReverseSearchCacheKey(query);
    const nowMs = now.getTime();

    const cached = await this.safeGetCache(cacheKey);

    if (!cached) {
      return this.fetchLiveAndCache(query, cacheKey, nowMs, "live");
    }

    const ageMs = nowMs - cached.cachedAtMs;
    const tier = classifyFreshness(ageMs);

    switch (tier) {
      case "fresh":
        return this.respondFromCache(query, cached, ageMs, "cache-fresh", tier);

      case "stale-notice":
        return this.respondFromCache(
          query,
          cached,
          ageMs,
          "cache-with-notice",
          tier,
          buildStaleNotice(new Date(cached.cachedAtMs), now),
        );

      case "must-validate":
        try {
          return await this.fetchLiveAndCache(query, cacheKey, nowMs, "cache-validated");
        } catch (err) {
          this.logger.warn("must-validate 階段即時校驗失敗，降級使用舊快取", { err, cacheKey });
          return this.respondFromCache(
            query,
            cached,
            ageMs,
            "cache-with-notice",
            tier,
            "系統嘗試更新票價資料失敗，目前顯示的是稍早查詢的結果",
            true,
          );
        }

      case "discard":
      default:
        try {
          return await this.fetchLiveAndCache(query, cacheKey, nowMs, "live");
        } catch (err) {
          this.logger.warn("快取已超過捨棄門檻且即時查詢失敗，降級使用過期快取", { err, cacheKey });
          return this.respondFromCache(
            query,
            cached,
            ageMs,
            "cache-with-notice",
            tier,
            "此資料已超過 48 小時且即時查詢失敗，票價極可能已經變動",
            true,
          );
        }
    }
  }

  private async safeGetCache(cacheKey: string): Promise<CacheEntry<FlightOffer[]> | null> {
    try {
      return await this.cacheStore.get<FlightOffer[]>(cacheKey);
    } catch (err) {
      this.logger.warn("讀取 Redis 快取失敗，改為直接查詢 Live API", { err, cacheKey });
      return null;
    }
  }

  private async fetchLiveAndCache(
    query: ReverseSearchQuery,
    cacheKey: string,
    nowMs: number,
    source: ResultSource,
  ): Promise<ReverseSearchResult> {
    const offersBeforeValidation = await this.searchClient.searchReverseFlights(query);

    // 即時航班狀態校驗（AeroDataBox）——只在真的打了 Live API 拿到新資料時才做，
    // 且校驗結果會一起寫入快取，讓後續 fresh/stale-notice 命中快取的請求也能看到它。
    // 校驗本身絕不拋出例外（見 FlightValidationService 的設計），這裡不需要額外 try/catch。
    const offers = await this.flightValidator.validateTopOffers(offersBeforeValidation, new Date(nowMs));

    try {
      await this.cacheStore.set(cacheKey, offers, nowMs);
    } catch (err) {
      // 寫入快取失敗不該讓這次查詢失敗——使用者還是能拿到即時結果，只是下次查詢不受惠於快取。
      this.logger.warn("寫入 Redis 快取失敗", { err, cacheKey });
    }

    const meta: CacheMeta = {
      source,
      tier: "fresh",
      cachedAt: new Date(nowMs).toISOString(),
      ageMs: 0,
    };

    return {
      destination: query.destination,
      queriedAt: new Date(nowMs).toISOString(),
      cache: meta,
      results: offers,
    };
  }

  private respondFromCache(
    query: ReverseSearchQuery,
    cached: CacheEntry<FlightOffer[]>,
    ageMs: number,
    source: ResultSource,
    tier: FreshnessTier,
    notice?: string,
    liveValidationFailed?: boolean,
  ): ReverseSearchResult {
    const meta: CacheMeta = {
      source,
      tier,
      cachedAt: new Date(cached.cachedAtMs).toISOString(),
      ageMs,
      ...(notice ? { notice } : {}),
      ...(liveValidationFailed ? { liveValidationFailed: true } : {}),
    };

    return {
      destination: query.destination,
      queriedAt: new Date().toISOString(),
      cache: meta,
      results: cached.data,
    };
  }
}
