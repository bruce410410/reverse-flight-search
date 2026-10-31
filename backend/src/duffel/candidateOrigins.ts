/**
 * 反向搜票的候選出發地清單——Duffel 版本。
 *
 * 跟 Travelpayouts 版本用的是同一份「橫跨各大洲主要航空市場」機場清單
 * （見 travelpayouts/candidateOrigins.ts 完整選擇背景），這裡獨立維護一份
 * 副本而不是共用同一個檔案，是刻意的：Duffel 模組跟 Travelpayouts 模組
 * 目前是兩個互不依賴、可以獨立切換的資料源實作（見 README「資料來源」），
 * 讓其中一個之後被移除或大改時，不會牽動到另一個還在使用中的模組。
 *
 * Duffel 測試模式（Duffel Airways，見 client.ts 檔頭註解）接受任意 IATA
 * 機場代碼，不像 Travelpayouts 那樣可能對特定機場代碼有資料覆蓋率落差，
 * 所以這份清單單純沿用既有的市場涵蓋範圍，沒有额外篩選考量。
 */
export interface CandidateOriginAirport {
  iata: string;
  city: string;
  country: string;
}

export const DEFAULT_CANDIDATE_ORIGIN_AIRPORTS: readonly CandidateOriginAirport[] = [
  // 東亞
  { iata: "NRT", city: "Tokyo", country: "Japan" },
  { iata: "ICN", city: "Seoul", country: "South Korea" },
  { iata: "PVG", city: "Shanghai", country: "China" },
  { iata: "TPE", city: "Taipei", country: "Taiwan" },
  { iata: "HKG", city: "Hong Kong", country: "Hong Kong" },
  // 東南亞 / 南亞
  { iata: "SIN", city: "Singapore", country: "Singapore" },
  { iata: "BKK", city: "Bangkok", country: "Thailand" },
  { iata: "KUL", city: "Kuala Lumpur", country: "Malaysia" },
  { iata: "SGN", city: "Ho Chi Minh City", country: "Vietnam" },
  { iata: "MNL", city: "Manila", country: "Philippines" },
  { iata: "CGK", city: "Jakarta", country: "Indonesia" },
  { iata: "DEL", city: "Delhi", country: "India" },
  // 美洲
  { iata: "LAX", city: "Los Angeles", country: "United States" },
  { iata: "YYZ", city: "Toronto", country: "Canada" },
  { iata: "MEX", city: "Mexico City", country: "Mexico" },
  { iata: "GRU", city: "Sao Paulo", country: "Brazil" },
  // 歐洲
  { iata: "LHR", city: "London", country: "United Kingdom" },
  { iata: "FRA", city: "Frankfurt", country: "Germany" },
  { iata: "CDG", city: "Paris", country: "France" },
  { iata: "AMS", city: "Amsterdam", country: "Netherlands" },
  { iata: "MAD", city: "Madrid", country: "Spain" },
  { iata: "FCO", city: "Rome", country: "Italy" },
  { iata: "ZRH", city: "Zurich", country: "Switzerland" },
  // 中東
  { iata: "DXB", city: "Dubai", country: "United Arab Emirates" },
  { iata: "RUH", city: "Riyadh", country: "Saudi Arabia" },
  // 大洋洲 / 非洲
  { iata: "SYD", city: "Sydney", country: "Australia" },
  { iata: "AKL", city: "Auckland", country: "New Zealand" },
  { iata: "JNB", city: "Johannesburg", country: "South Africa" },
] as const;

/** 依環境變數覆寫值（逗號分隔的 IATA 代碼）解析出實際要查詢的候選出發地清單。 */
export function resolveCandidateOrigins(overrideCsv: string): readonly CandidateOriginAirport[] {
  const trimmed = overrideCsv.trim();
  if (!trimmed) return DEFAULT_CANDIDATE_ORIGIN_AIRPORTS;

  const byIata = new Map(DEFAULT_CANDIDATE_ORIGIN_AIRPORTS.map((a) => [a.iata, a]));

  return trimmed
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0)
    .map((code) => byIata.get(code) ?? { iata: code, city: code, country: "" });
}
