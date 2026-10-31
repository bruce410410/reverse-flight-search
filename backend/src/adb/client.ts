import type { AppEnv } from "../config/env.js";
import {
  AeroDataBoxHttpError,
  AeroDataBoxNetworkError,
  AeroDataBoxNotConfiguredError,
  AeroDataBoxRateLimitError,
  AeroDataBoxTimeoutError,
} from "./errors.js";
import type { RawAeroDataBoxErrorResponse, RawAeroDataBoxSearchResponse } from "./types.js";

/**
 * AeroDataBox API client：查詢單一航班在指定日期的即時狀態。
 *
 * 用途是「風險判斷」，不是「找票價」——Kiwi 負責票價與航班組合，AeroDataBox
 * 負責回答「這個航班真的還照原訂計畫飛嗎？還是已經取消或大幅改期？」，
 * 用來補足快取票價可能已經過時、但價格本身看起來還很正常（因此不會被 4 層鮮度判斷攔下來）
 * 的風險缺口。
 */
export class AeroDataBoxClient {
  constructor(private readonly env: AppEnv) {}

  isConfigured(): boolean {
    return this.env.AERODATABOX_API_KEY.length > 0;
  }

  /**
   * 查詢航班狀態。
   * @param airlineIata 航空公司 IATA 代碼，例如 "CI"
   * @param flightNumber 航班號碼（不含航空公司代碼），例如 100
   * @param dateIso 該航班「出發地」的當地日期，ISO 格式 "YYYY-MM-DD"
   *
   * 回傳空陣列代表「查無此航班」（可能是航班已停飛、號碼變更，或日期輸入有誤），
   * 這是正常的資料狀態而不是錯誤，交由呼叫端（validator）判斷後續分類。
   */
  async getFlightStatus(
    airlineIata: string,
    flightNumber: number,
    dateIso: string,
  ): Promise<RawAeroDataBoxSearchResponse> {
    if (!this.isConfigured()) {
      throw new AeroDataBoxNotConfiguredError();
    }

    const flightDesignator = `${airlineIata}${flightNumber}`;
    const url = `${this.env.AERODATABOX_API_BASE_URL}/flights/number/${encodeURIComponent(
      flightDesignator,
    )}/${encodeURIComponent(dateIso)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.AERODATABOX_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": this.env.AERODATABOX_API_KEY,
          "X-RapidAPI-Host": this.env.AERODATABOX_API_HOST,
          accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new AeroDataBoxTimeoutError(this.env.AERODATABOX_REQUEST_TIMEOUT_MS);
      }
      throw new AeroDataBoxNetworkError("無法連線到 AeroDataBox API", err);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 404) {
      // 查無此航班：視為合法的空結果，不是錯誤。
      return [];
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : null;
      throw new AeroDataBoxRateLimitError(Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds);
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as RawAeroDataBoxErrorResponse;
      const message = errorBody.message ?? errorBody.error ?? response.statusText;
      throw new AeroDataBoxHttpError(response.status, message);
    }

    const body = (await response.json()) as RawAeroDataBoxSearchResponse;
    return Array.isArray(body) ? body : [];
  }
}
