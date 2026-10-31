/** SerpApi（Google Flights）呼叫失敗的基底錯誤類別，讓上層可以用 instanceof 分流處理。 */
export class SerpApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerpApiError";
  }
}

/** 網路層級錯誤（連不上、DNS 失敗等），與 HTTP 錯誤回應區分開來。 */
export class SerpApiNetworkError extends SerpApiError {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "SerpApiNetworkError";
  }
}

/** 請求逾時。 */
export class SerpApiTimeoutError extends SerpApiError {
  constructor(timeoutMs: number) {
    super(`SerpApi 請求逾時（${timeoutMs}ms）`);
    this.name = "SerpApiTimeoutError";
  }
}

/**
 * 429：SerpApi 免費方案（每月 250 次成功搜尋）額度用盡，或每小時吞吐量超限。
 * SerpApi 不保證回傳 Retry-After，讀不到時為 null（見 client.ts）。
 */
export class SerpApiRateLimitError extends SerpApiError {
  constructor(readonly retryAfterSeconds: number | null, detail?: string) {
    super(`SerpApi 已達呼叫上限（免費方案每月 250 次）${detail ? `：${detail}` : ""}`);
    this.name = "SerpApiRateLimitError";
  }
}

/** 4xx/5xx 但非 429 的一般 HTTP 錯誤，或 HTTP 200 但 body 帶 error 欄位（例如金鑰無效）。 */
export class SerpApiHttpError extends SerpApiError {
  constructor(readonly statusCode: number, message: string) {
    super(`SerpApi 回傳錯誤 (HTTP ${statusCode}): ${message}`);
    this.name = "SerpApiHttpError";
  }
}

/**
 * 候選出發地會被切成好幾批（每批一次請求，見 client.ts），單一批失敗不該讓整個查詢失敗。
 * 只有「所有批次全部失敗」時才往上拋這個聚合錯誤，讓 ReverseSearchService 既有的快取降級邏輯接手。
 */
export class SerpApiAllBatchesFailedError extends SerpApiError {
  constructor(readonly causes: unknown[]) {
    super(`所有候選出發地批次的 SerpApi 查詢全部失敗（共 ${causes.length} 批）`);
    this.name = "SerpApiAllBatchesFailedError";
  }
}
