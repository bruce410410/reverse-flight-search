/**
 * 反向搜票核心邏輯的網域型別。
 *
 * 核心設計理念：不設出發地，以目的地為查詢主體。
 * 一次查詢對應「一個目的地 + 一段日期範圍」，回傳的是「多個候選出發地」各自最便宜的航班，
 * 而不是傳統機票搜尋的單一出發地→單一目的地配對。
 */

export type TripType = "one-way" | "round-trip";

export interface ReverseSearchQuery {
  /** 目的地 IATA 機場代碼，例如 "TPE"。這是查詢的主體，必填。 */
  destination: string;
  /** 去程日期範圍起（ISO 8601 date, "YYYY-MM-DD"） */
  dateFrom: string;
  /** 去程日期範圍迄 */
  dateTo: string;
  tripType: TripType;
  /** round-trip 時必填：回程日期範圍 */
  returnDateFrom?: string;
  returnDateTo?: string;
  /** ISO 4217 貨幣代碼，預設 TWD */
  currency: string;
  /** 最多回傳幾個候選出發地，預設 20 */
  maxResults: number;
}

/** 單一航段（起降機場、航班班號），用於向 AeroDataBox 查詢即時航班狀態。 */
export interface FlightSegment {
  airlineIata: string;
  flightNumber: number;
  departureAirport: string;
  arrivalAirport: string;
  departureAt: string;
  /**
   * 抵達時間。Travelpayouts 資料源（見 travelpayouts/mapper.ts）不提供這個欄位，
   * 因此改為 optional；AeroDataBox 即時校驗不依賴這個欄位（只用 airlineIata /
   * flightNumber / departureAt 的日期部分），所以留空不影響校驗功能。
   */
  arrivalAt?: string;
}

/**
 * AeroDataBox 即時校驗結果。
 *  - confirmed：航班確實存在且時間吻合，未見取消/大幅改期
 *  - schedule-changed：航班存在，但實際/最新排定時間與 Kiwi 資料有明顯落差
 *  - cancelled：該班次已被航空公司取消
 *  - unknown：查無資料，或驗證服務本身異常（額度用盡、逾時等），無法下結論
 *  - not-checked：本次查詢未觸發即時校驗（例如超出 Top-N 範圍，或快取本身夠新不需要校驗）
 */
export type LiveValidationStatus = "confirmed" | "schedule-changed" | "cancelled" | "unknown" | "not-checked";

export interface FlightStatusCheck {
  status: LiveValidationStatus;
  /** 校驗發生的時間；status 為 "not-checked" 時沒有實際校驗動作，此欄位為 undefined */
  checkedAt?: string;
  details?: string;
}

/**
 * 單一候選出發地的最便宜航班選項。
 *
 * arrivalAt / durationMinutes / stopovers / bookingToken / deepLink 都是 optional
 * ——這個系統已經換過三次資料源（Kiwi → Travelpayouts → Duffel → Sky-scrapper，
 * 完整歷史見 README「資料來源」一節），每個 provider 能提供的欄位不盡相同：
 * Travelpayouts 不提供抵達時間/飛行時長/轉機次數/booking token；Duffel（測試模式，
 * 已停用）這些都有但沒有消費者訂票頁；Sky-scrapper（目前使用中）多數欄位都有，
 * 但沒有 bookingToken/deepLink（非官方查詢 API，沒有訂票頁可連），且 segments
 * 裡的航班班號欄位未經官方文件驗證，缺席時直接回傳空陣列而不是編造資料
 * （見 skyscrapper/mapper.ts）。前端在欄位缺席時直接不顯示對應 UI，
 * 不會顯示假造的 0 或 "unknown"。
 */
export interface FlightOffer {
  /** 出發地機場 IATA 代碼 */
  origin: string;
  originCity: string;
  originCountry: string;
  price: number;
  currency: string;
  airlines: string[];
  departureAt: string; // ISO 8601 datetime
  arrivalAt?: string;
  durationMinutes?: number;
  stopovers?: number;
  /** 下單用的 token；資料源可提供時填入（Duffel 用自己的 offer id），Travelpayouts 版本則用 deepLink 導去搜尋結果頁下單 */
  bookingToken?: string;
  /** 可直接導去訂票頁（或搜尋結果頁）的深連結；Duffel 版本沒有這種頁面可連，缺席 */
  deepLink?: string;
  /** 這筆票價資料本身的失效時間（Travelpayouts 提供，非必填） */
  priceExpiresAt?: string;
  /** 完整航段資訊（可能多段轉機），供 AeroDataBox 校驗第一段實際航班使用 */
  segments: FlightSegment[];
  /** AeroDataBox 即時校驗結果；未觸發校驗時為 { status: "not-checked" } */
  flightStatus: FlightStatusCheck;
}

/** 快取鮮度分級。與專案規範的 4 層快取鮮度判斷一一對應。 */
export type FreshnessTier = "fresh" | "stale-notice" | "must-validate" | "discard";

/** 回應中實際使用的資料來源，反映快取決策後真正發生的行為。 */
export type ResultSource = "cache-fresh" | "cache-with-notice" | "cache-validated" | "live";

export interface CacheMeta {
  source: ResultSource;
  tier: FreshnessTier;
  /** 快取寫入時間；資料完全來自即時查詢時為 null */
  cachedAt: string | null;
  /** 快取年齡（毫秒）；資料完全來自即時查詢時為 0 */
  ageMs: number;
  /** <=24h 時附上的提示文字 */
  notice?: string;
  /** <=48h 或 >48h 嘗試即時校驗但失敗，改為降級使用舊快取時為 true */
  liveValidationFailed?: boolean;
}

export interface ReverseSearchResult {
  destination: string;
  queriedAt: string;
  cache: CacheMeta;
  results: FlightOffer[];
}
