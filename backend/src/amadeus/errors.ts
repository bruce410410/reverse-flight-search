export class AmadeusApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmadeusApiError";
  }
}

export class AmadeusHttpError extends AmadeusApiError {
  constructor(public readonly statusCode: number, message: string) {
    super(`HTTP ${statusCode}: ${message}`);
    this.name = "AmadeusHttpError";
  }
}

export class AmadeusNetworkError extends AmadeusApiError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AmadeusNetworkError";
  }
}

export class AmadeusTimeoutError extends AmadeusApiError {
  constructor(timeoutMs: number) {
    super(`Amadeus API 請求逾時（${timeoutMs}ms）`);
    this.name = "AmadeusTimeoutError";
  }
}

export class AmadeusAllOriginsFailedError extends AmadeusApiError {
  constructor(public readonly causes: unknown[]) {
    super(`所有候選出發地的 Amadeus 查詢全部失敗（共 ${causes.length} 個）`);
    this.name = "AmadeusAllOriginsFailedError";
  }
}
