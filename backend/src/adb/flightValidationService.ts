import type { AppEnv } from "../config/env.js";
import type { FlightOffer } from "../types/flight.js";
import { AeroDataBoxClient } from "./client.js";
import { AeroDataBoxApiError, AeroDataBoxNotConfiguredError } from "./errors.js";
import { classifyFlightStatus, unavailableFlightStatus } from "./validator.js";

export interface FlightValidationLogger {
  warn: (msg: string, meta?: Record<string, unknown>) => void;
}

const noopLogger: FlightValidationLogger = { warn: () => {} };

/**
 * 對候選出發地清單做「即時航班狀態校驗」的服務層。
 *
 * 設計原則：
 *  - 只驗證前 topN 筆（依價格排序後最便宜的幾筆），因為使用者實際會考慮下單的
 *    通常就是最便宜的少數選項，沒必要對每個候選出發地都打一次 AeroDataBox。
 *  - 只驗證第一個航段——多轉機行程的後續航段驗證留待未來需要時再擴充，
 *    第一段（實際出發班機）通常是使用者最關心「這班到底還飛不飛」的那一段。
 *  - 任何校驗失敗（額度用盡、逾時、未設定金鑰）都絕不讓整個搜尋失敗，
 *    只會讓對應候選出發地的 flightStatus 落回 "unknown" 並附上原因。
 */
export class FlightValidationService {
  constructor(
    private readonly client: AeroDataBoxClient,
    private readonly topN: number,
    private readonly logger: FlightValidationLogger = noopLogger,
  ) {}

  /** 就地驗證並回傳新的（不可變風格）offers 陣列，前 topN 筆會被附上 flightStatus。 */
  async validateTopOffers(offers: FlightOffer[], now: Date = new Date()): Promise<FlightOffer[]> {
    if (this.topN <= 0 || !this.client.isConfigured()) {
      // 功能未啟用：所有候選出發地維持 mapper 給的預設值 "not-checked"，不記警告
      // （這是可預期的設定，不是異常狀況）。
      return offers;
    }

    const toValidate = offers.slice(0, this.topN);
    const rest = offers.slice(this.topN);

    const validated = await Promise.all(toValidate.map((offer) => this.validateOne(offer, now)));

    return [...validated, ...rest];
  }

  private async validateOne(offer: FlightOffer, now: Date): Promise<FlightOffer> {
    const firstSegment = offer.segments[0];
    if (!firstSegment) {
      return { ...offer, flightStatus: unavailableFlightStatus("航班資料缺少航段資訊，無法校驗", now) };
    }

    try {
      const raw = await this.client.getFlightStatus(
        firstSegment.airlineIata,
        firstSegment.flightNumber,
        firstSegment.departureAt.slice(0, 10),
      );
      const flightStatus = classifyFlightStatus(raw, firstSegment.departureAt, now);
      return { ...offer, flightStatus };
    } catch (err) {
      if (err instanceof AeroDataBoxNotConfiguredError) {
        // 理論上不會走到這裡（isConfigured() 已經先擋掉），但仍防禦性處理。
        return { ...offer, flightStatus: unavailableFlightStatus(err.message, now) };
      }
      if (err instanceof AeroDataBoxApiError) {
        this.logger.warn("AeroDataBox 即時校驗失敗，該候選出發地標記為 unknown", {
          err,
          origin: offer.origin,
        });
        return { ...offer, flightStatus: unavailableFlightStatus(`即時校驗服務暫時無法使用：${err.message}`, now) };
      }
      // 非預期錯誤：一樣不讓它往上傳播拖垮整個搜尋，但用不同訊息方便日後排查。
      this.logger.warn("AeroDataBox 校驗發生未預期錯誤", { err, origin: offer.origin });
      return { ...offer, flightStatus: unavailableFlightStatus("即時校驗發生未預期錯誤", now) };
    }
  }
}

/** 依環境設定組裝 FlightValidationService 的便利函式。 */
export function createFlightValidationService(
  env: AppEnv,
  logger?: FlightValidationLogger,
): FlightValidationService {
  return new FlightValidationService(new AeroDataBoxClient(env), env.AERODATABOX_VALIDATE_TOP_N, logger);
}
