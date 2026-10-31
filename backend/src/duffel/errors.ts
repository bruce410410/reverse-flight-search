/** Duffel API 呼叫失敗的基底錯誤類別，讓上層可以用 instanceof 分流處理。 */
export class DuffelApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuffelApiError";
  }
}

/** 網路層級錯誤（連不上、DNS 失敗等），與 HTTP 錯誤回應區分開來。 */
export class DuffelNetworkError extends DuffelApiError {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "DuffelNetworkError";
  }
}

/** 請求逾時。Duffel 官方文件建議 client timeout 至少 130 秒（部分航空公司系統回應可能長達 120 秒）。 */
export class DuffelTimeoutError extends DuffelApiError {
  constructor(timeoutMs: number) {
    super(`Duffel API 請求逾時（${timeoutMs}ms）`);
    this.name = "DuffelTimeoutError";
  }
}

/** 429 Too Many Requests：呼叫頻率超過額度。Duffel 用 ratelimit-reset（HTTP 日期格式）而非數字秒數。 */
export class DuffelRateLimitError extends DuffelApiError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds !== null
        ? `Duffel API 已達呼叫頻率上限，請於 ${retryAfterSeconds} 秒後重試`
        : "Duffel API 已達呼叫頻率上限",
    );
    this.name = "DuffelRateLimitError";
  }
}

/** 4xx/5xx 但非 429 的一般 HTTP 錯誤。 */
export class DuffelHttpError extends DuffelApiError {
  constructor(readonly statusCode: number, message: string) {
    super(`Duffel API 回傳錯誤 (HTTP ${statusCode}): ${message}`);
    this.name = "DuffelHttpError";
  }
}

/**
 * 反向搜尋是「對每個候選出發地平行打一次請求」的設計（見 client.ts），單一候選
 * 出發地失敗不該讓整個查詢失敗。只有「所有候選出發地全部失敗」時，才把這個
 * 聚合錯誤往上拋，讓 ReverseSearchService 既有的快取降級邏輯接手。
 */
export class DuffelAllOriginsFailedError extends DuffelApiError {
  constructor(readonly causes: unknown[]) {
    super(`所有候選出發地的 Duffel 查詢全部失敗（共 ${causes.length} 個）`);
    this.name = "DuffelAllOriginsFailedError";
  }
}
