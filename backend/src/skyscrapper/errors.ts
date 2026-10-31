/** Sky-scrapper（RapidAPI）呼叫失敗的基底錯誤類別，讓上層可以用 instanceof 分流處理。 */
export class SkyscrapperApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkyscrapperApiError";
  }
}

/** 網路層級錯誤（連不上、DNS 失敗等），與 HTTP 錯誤回應區分開來。 */
export class SkyscrapperNetworkError extends SkyscrapperApiError {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "SkyscrapperNetworkError";
  }
}

/** 請求逾時。 */
export class SkyscrapperTimeoutError extends SkyscrapperApiError {
  constructor(timeoutMs: number) {
    super(`Sky-scrapper API 請求逾時（${timeoutMs}ms）`);
    this.name = "SkyscrapperTimeoutError";
  }
}

/**
 * 429 Too Many Requests：RapidAPI 免費方案（BASIC，每月 50 次，2026-09-22 用真實請求的
 * `x-ratelimit-requests-limit` header 驗證過）額度用盡或呼叫過於頻繁。
 * RapidAPI 的 429 一般用標準的 `Retry-After`（秒數）或 `X-RateLimit-Requests-Reset` header，
 * 這裡兩者都嘗試讀取，讀不到就回傳 null（見 client.ts）。
 */
export class SkyscrapperRateLimitError extends SkyscrapperApiError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds !== null
        ? `Sky-scrapper API 已達呼叫頻率上限（免費方案每月 50 次），請於 ${retryAfterSeconds} 秒後重試`
        : "Sky-scrapper API 已達呼叫頻率上限（免費方案每月 50 次）",
    );
    this.name = "SkyscrapperRateLimitError";
  }
}

/** 4xx/5xx 但非 429 的一般 HTTP 錯誤。 */
export class SkyscrapperHttpError extends SkyscrapperApiError {
  constructor(readonly statusCode: number, message: string) {
    super(`Sky-scrapper API 回傳錯誤 (HTTP ${statusCode}): ${message}`);
    this.name = "SkyscrapperHttpError";
  }
}

/**
 * 無法把某個 IATA 機場代碼解析成 Sky-scrapper 需要的 skyId/entityId
 * （見 entityResolver.ts）——可能是這個代碼不在 Skyscanner 的資料庫裡，
 * 也可能是 searchAirport 回應格式跟預期不同。
 */
export class SkyscrapperEntityResolutionError extends SkyscrapperApiError {
  constructor(readonly iata: string) {
    super(`無法解析機場代碼 ${iata} 對應的 Sky-scrapper skyId/entityId`);
    this.name = "SkyscrapperEntityResolutionError";
  }
}

/**
 * 反向搜尋是「對每個候選出發地平行打一次請求」的設計，單一候選出發地失敗
 * 不該讓整個查詢失敗。只有「所有候選出發地全部失敗」時，才把這個聚合錯誤
 * 往上拋，讓 ReverseSearchService 既有的快取降級邏輯接手。
 */
export class SkyscrapperAllOriginsFailedError extends SkyscrapperApiError {
  constructor(readonly causes: unknown[]) {
    super(`所有候選出發地的 Sky-scrapper 查詢全部失敗（共 ${causes.length} 個）`);
    this.name = "SkyscrapperAllOriginsFailedError";
  }
}
