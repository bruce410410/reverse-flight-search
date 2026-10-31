/**
 * 反向搜票的候選出發地清單——Travelpayouts（Aviasales）Data API 版本。
 *
 * === 背景：為什麼從「國家清單」改成「機場清單」 ===
 *
 * 原本 Kiwi Tequila 版本用 `fly_from=Country:XX,Country:YY,...` 一次查詢就能涵蓋
 * 一整個國家、甚至多個國家。Travelpayouts 的 `/v1/prices/cheap` 端點不支援這種
 * 「地點群組」語法——`origin` 參數官方文件明確要求是「單一出發城市的 IATA 代碼」
 * （見 https://travelpayouts.github.io/slate/#cheapest-tickets）。
 *
 * 因此候選出發地策略從「查一次涵蓋一整個國家」改成「每個候選市場挑一個代表性機場，
 * 對每個機場各打一次請求，平行送出後彙整結果」。這個「拆成多次平行請求、內部合併」
 * 的做法，其實正是原本 Kiwi 版本文件裡就已經寫好的備援方案（見
 * TEST_REPORT_anywhere-verification.md 第五節），現在直接成為主要實作。
 *
 * === 為什麼是這些機場 ===
 *
 * 沿用原本 27 個國家的市場涵蓋範圍（橫跨東亞、東南亞/南亞、美洲、歐洲、中東、
 * 大洋洲/非洲），每個國家選一個該國最主要的國際機場作為代表。這是人工篩選、
 * 非窮舉——同一國家可能有其他機場也有低價航班，但控制在合理數量（約 28 個）
 * 才能讓「一次反向搜尋」的平行請求數量保持可控。可透過
 * TRAVELPAYOUTS_CANDIDATE_ORIGINS 環境變數覆寫（逗號分隔的 IATA 機場代碼），
 * 不需要改程式碼就能調整涵蓋範圍。
 *
 * === 殘留風險 ===
 *
 * 這份對照表（機場 → 城市 → 國家顯示名稱）是人工整理的靜態資料，因為
 * Travelpayouts `/v1/prices/cheap` 的回應本身不包含城市/國家名稱，只有
 * 價格、航空公司、班號、時間（見 client.ts 檔頭註解）。若之後 IATA 代碼
 * 對應的機場異動，這份對照表需要人工更新。
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

/**
 * 依環境變數覆寫值（逗號分隔的 IATA 代碼）解析出實際要查詢的候選出發地清單。
 * 覆寫時只提供代碼，城市/國家名稱查不到對照表的話就用代碼本身頂著，
 * 不讓查詢因為顯示名稱缺失而失敗。
 */
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
