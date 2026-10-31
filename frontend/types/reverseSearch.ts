/**
 * 對應後端 POST /api/reverse-search 的請求/回應格式（見專案根目錄 README.md）。
 *
 * 目前前後端各自維護一份型別定義（沒有共用套件），這是刻意的權衡：
 * 現階段是單一 monorepo 內的兩個獨立 package，重複定義比引入共用套件的建置複雜度更划算。
 * 若之後型別開始頻繁不同步，才需要考慮抽成 shared package。
 */

export type TripType = "one-way" | "round-trip";

export interface ReverseSearchFormState {
  destination: string;
  dateFrom: string;
  dateTo: string;
  tripType: TripType;
  returnDateFrom: string;
  returnDateTo: string;
  currency: string;
  maxResults: number;
}

export type LiveValidationStatus = "confirmed" | "schedule-changed" | "cancelled" | "unknown" | "not-checked";

export interface FlightStatusCheck {
  status: LiveValidationStatus;
  checkedAt?: string;
  details?: string;
}

export interface FlightSegment {
  airlineIata: string;
  flightNumber: number;
  departureAirport: string;
  arrivalAirport: string;
  departureAt: string;
  /** 資料源（Travelpayouts）不提供抵達時間，可能缺席，見 ResultList.vue 的顯示邏輯 */
  arrivalAt?: string;
}

/**
 * arrivalAt / durationMinutes / stopovers / bookingToken / deepLink 都是 optional：
 * 後端資料源已經換過兩次（Kiwi → Travelpayouts → Duffel，2026-09），每個
 * provider 能提供的欄位不同，目前使用中的 Duffel（測試模式）有完整的抵達
 * 時間/飛行時長/轉機次數，但沒有消費者訂票頁可以連結，所以是 deepLink 缺席。
 * 缺席的欄位前端不顯示對應區塊，不會顯示假資料。
 */
export interface FlightOffer {
  origin: string;
  originCity: string;
  originCountry: string;
  price: number;
  currency: string;
  airlines: string[];
  departureAt: string;
  arrivalAt?: string;
  durationMinutes?: number;
  stopovers?: number;
  bookingToken?: string;
  deepLink?: string;
  priceExpiresAt?: string;
  segments: FlightSegment[];
  flightStatus: FlightStatusCheck;
}

export type FreshnessTier = "fresh" | "stale-notice" | "must-validate" | "discard";
export type ResultSource = "cache-fresh" | "cache-with-notice" | "cache-validated" | "live";

export interface CacheMeta {
  source: ResultSource;
  tier: FreshnessTier;
  cachedAt: string | null;
  ageMs: number;
  notice?: string;
  liveValidationFailed?: boolean;
}

export interface ReverseSearchResult {
  destination: string;
  queriedAt: string;
  cache: CacheMeta;
  results: FlightOffer[];
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: { path: string; message: string }[];
}
