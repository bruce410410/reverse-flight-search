/** Travelpayouts API 呼叫失敗的基底錯誤類別，讓上層可以用 instanceof 分流處理。 */
export class TravelpayoutsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TravelpayoutsApiError";
  }
}

/** 網路層級錯誤（連不上、DNS 失敗等），與 HTTP 錯誤回應區分開來。 */
export class TravelpayoutsNetworkError extends TravelpayoutsApiError {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "TravelpayoutsNetworkError";
  }
}

/** 請求逾時。 */
export class TravelpayoutsTimeoutError extends TravelpayoutsApiError {
  constructor(timeoutMs: number) {
    super(`Travelpayouts API 請求逾時（${timeoutMs}ms）`);
    this.name = "TravelpayoutsTimeoutError";
  }
}

/** 429 Too Many Requests：呼叫頻率超過額度。 */
export class TravelpayoutsRateLimitError extends TravelpayoutsApiError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds !== null
        ? `Travelpayouts API 已達呼叫頻率上限，請於 ${retryAfterSeconds} 秒後重試`
        : "Travelpayouts API 已達呼叫頻率上限",
    );
    this.name = "TravelpayoutsRateLimitError";
  }
}

/** 4xx/5xx 但非 429 的一般 HTTP 錯誤。 */
export class TravelpayoutsHttpError extends TravelpayoutsApiError {
  constructor(readonly statusCode: number, message: string) {
    super(`Travelpayouts API 回傳錯誤 (HTTP ${statusCode}): ${message}`);
    this.name = "TravelpayoutsHttpError";
  }
}

/**
 * 反向搜尋是「對每個候選出發地平行打一次請求」的設計，單一候選出發地失敗
 * 不該讓整個查詢失敗（見 client.ts）。只有「所有候選出發地全部失敗」時，
 * 才把這個聚合錯誤往上拋，讓 ReverseSearchService 的既有快取降級邏輯接手。
 */
export class TravelpayoutsAllOriginsFailedError extends TravelpayoutsApiError {
  constructor(readonly causes: unknown[]) {
    super(`所有候選出發地的 Travelpayouts 查詢全部失敗（共 ${causes.length} 個）`);
    this.name = "TravelpayoutsAllOriginsFailedError";
  }
}
