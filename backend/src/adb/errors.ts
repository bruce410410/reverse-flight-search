/** AeroDataBox 呼叫失敗的基底錯誤類別。與 kiwi/errors.ts 採相同分類方式，方便上層一致處理。 */
export class AeroDataBoxApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AeroDataBoxApiError";
  }
}

export class AeroDataBoxNetworkError extends AeroDataBoxApiError {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "AeroDataBoxNetworkError";
  }
}

export class AeroDataBoxTimeoutError extends AeroDataBoxApiError {
  constructor(timeoutMs: number) {
    super(`AeroDataBox API 請求逾時（${timeoutMs}ms）`);
    this.name = "AeroDataBoxTimeoutError";
  }
}

export class AeroDataBoxRateLimitError extends AeroDataBoxApiError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds !== null
        ? `AeroDataBox API 已達呼叫頻率上限，請於 ${retryAfterSeconds} 秒後重試`
        : "AeroDataBox API 已達呼叫頻率上限",
    );
    this.name = "AeroDataBoxRateLimitError";
  }
}

export class AeroDataBoxHttpError extends AeroDataBoxApiError {
  constructor(readonly statusCode: number, message: string) {
    super(`AeroDataBox API 回傳錯誤 (HTTP ${statusCode}): ${message}`);
    this.name = "AeroDataBoxHttpError";
  }
}

/** 未設定 API key 時的專用錯誤，讓呼叫端可以區分「功能未啟用」與「呼叫失敗」。 */
export class AeroDataBoxNotConfiguredError extends AeroDataBoxApiError {
  constructor() {
    super("尚未設定 AERODATABOX_API_KEY，即時航班校驗功能未啟用");
    this.name = "AeroDataBoxNotConfiguredError";
  }
}
