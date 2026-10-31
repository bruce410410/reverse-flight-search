/**
 * 反向搜票的候選出發地清單——Amadeus 版本。
 *
 * Amadeus 測試環境免費且無呼叫額度限制，所以候選機場清單比 Sky-scrapper 版本
 * 更寬（10 個），覆蓋更多主要航空樞紐。上線後切換到正式環境時，正式環境免費
 * 額度耗盡後才需要付費，視實際使用量決定是否縮減清單。
 */
export interface CandidateOriginAirport {
  iata: string;
  city: string;
  country: string;
}

export const DEFAULT_CANDIDATE_ORIGIN_AIRPORTS: readonly CandidateOriginAirport[] = [
  { iata: "NRT", city: "Tokyo", country: "Japan" },
  { iata: "ICN", city: "Seoul", country: "South Korea" },
  { iata: "HKG", city: "Hong Kong", country: "Hong Kong" },
  { iata: "SIN", city: "Singapore", country: "Singapore" },
  { iata: "BKK", city: "Bangkok", country: "Thailand" },
  { iata: "SYD", city: "Sydney", country: "Australia" },
  { iata: "LAX", city: "Los Angeles", country: "United States" },
  { iata: "LHR", city: "London", country: "United Kingdom" },
  { iata: "FRA", city: "Frankfurt", country: "Germany" },
  { iata: "DXB", city: "Dubai", country: "United Arab Emirates" },
] as const;

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
