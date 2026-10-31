/**
 * 反向搜票的候選出發地清單——SerpApi（Google Flights）版本。
 *
 * 跟 Sky-scrapper 版本（6 個機場）不同，這裡可以放比較多機場：SerpApi 的
 * `departure_id` 參數接受逗號分隔的多個機場，一次請求就能查一整批出發地，
 * 額度是「每次請求」計算而不是「每個機場」計算。Google Flights 介面本身
 * 一個欄位最多只能填 7 個機場，所以 client 會把清單切成每批最多
 * SERPAPI_MAX_ORIGINS_PER_REQUEST（預設 7）個；預設 14 個機場 = 每次搜尋 2 次請求，
 * 免費方案每月 250 次大約能完整搜尋 125 次。
 *
 * 跟其他資料源一樣獨立維護一份副本，讓各資料源模組彼此不互相牽動。
 */
export interface CandidateOriginAirport {
  iata: string;
  city: string;
  country: string;
}

export const DEFAULT_CANDIDATE_ORIGIN_AIRPORTS: readonly CandidateOriginAirport[] = [
  // 東亞 / 東南亞
  { iata: "NRT", city: "Tokyo", country: "Japan" },
  { iata: "KIX", city: "Osaka", country: "Japan" },
  { iata: "ICN", city: "Seoul", country: "South Korea" },
  { iata: "HKG", city: "Hong Kong", country: "Hong Kong" },
  { iata: "SIN", city: "Singapore", country: "Singapore" },
  { iata: "BKK", city: "Bangkok", country: "Thailand" },
  { iata: "KUL", city: "Kuala Lumpur", country: "Malaysia" },
  // 美洲
  { iata: "LAX", city: "Los Angeles", country: "United States" },
  { iata: "SFO", city: "San Francisco", country: "United States" },
  // 歐洲
  { iata: "LHR", city: "London", country: "United Kingdom" },
  { iata: "CDG", city: "Paris", country: "France" },
  // 中東
  { iata: "DXB", city: "Dubai", country: "United Arab Emirates" },
  // 大洋洲 / 菲律賓
  { iata: "SYD", city: "Sydney", country: "Australia" },
  { iata: "MNL", city: "Manila", country: "Philippines" },
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

/** 把候選清單切成每批最多 size 個機場，每批對應一次 SerpApi 請求。 */
export function chunkOrigins<T>(origins: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < origins.length; i += size) {
    batches.push(origins.slice(i, i + size));
  }
  return batches;
}
