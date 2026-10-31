/**
 * SerpApi Google Flights 引擎（engine=google_flights）的原始回應型別。
 *
 * 只列出 mapper 真正會讀的欄位，依據 https://serpapi.com/google-flights-api 文件範例整理。
 * 尚未用真實金鑰的回應逐欄核對過（2026-10-12 撰寫時雲端與本機沙盒都連不到 serpapi.com），
 * 所以所有欄位都標為 optional，mapper 缺欄位時直接丟棄該筆，不編造資料。
 */
export interface RawSerpApiAirport {
  name?: string;
  id?: string;
  /** 當地時間，格式 "YYYY-MM-DD HH:mm" */
  time?: string;
}

export interface RawSerpApiFlightSegment {
  departure_airport?: RawSerpApiAirport;
  arrival_airport?: RawSerpApiAirport;
  duration?: number;
  airline?: string;
  /** 例如 "JL 811"：航空公司 IATA 代碼 + 空白 + 班號 */
  flight_number?: string;
}

export interface RawSerpApiItinerary {
  flights?: RawSerpApiFlightSegment[];
  layovers?: { duration?: number; name?: string; id?: string }[];
  total_duration?: number;
  price?: number;
  type?: string;
  departure_token?: string;
  booking_token?: string;
}

export interface RawSerpApiSearchResponse {
  search_metadata?: {
    id?: string;
    status?: string;
    google_flights_url?: string;
  };
  best_flights?: RawSerpApiItinerary[];
  other_flights?: RawSerpApiItinerary[];
  error?: string;
}
