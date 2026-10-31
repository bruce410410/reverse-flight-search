/**
 * 反向搜票的候選出發地清單——Sky-scrapper（RapidAPI）版本。
 *
 * 跟 Duffel／Travelpayouts 版本刻意不同：只保留 6 個機場，而不是原本的 28 個。
 * 原因是 Sky-scrapper 的免費方案（RapidAPI BASIC）每月呼叫額度只有 **50 次**
 * （2026-09-22 用使用者實際申請到的金鑰打過一次真實請求，從回應的
 * `x-ratelimit-requests-limit` header 確認是 50，不是最初從第三方部落格
 * 文章查到、估計錯誤的 100 次），而反向搜尋是「每個候選出發地平行查一次」的
 * fan-out 設計——原本設定的 10 個機場會讓第一次搜尋（含每個機場首次解析
 * skyId/entityId 的額外呼叫）就吃掉超過三分之一的月額度。縮小到 6 個機場後，
 * entityId 解析結果快取後，之後每次搜尋大致是 6 次呼叫，每月大約能搜 7-8 次。
 *
 * 這是跟使用者確認「縮小候選清單」取捨後、再依真實額度數字校準的結果：
 * 先用縮小過的清單把整條資料流驗證起來，之後如果升級付費方案，
 * 再把 SKYSCRAPPER_CANDIDATE_ORIGINS 或這份預設清單放大即可。
 *
 * 跟 Duffel／Travelpayouts 版本一樣，獨立維護一份副本而不是共用同一個檔案，
 * 讓三個資料源模組彼此不互相牽動（見 README「資料來源」）。
 */
export interface CandidateOriginAirport {
  iata: string;
  city: string;
  country: string;
}

export const DEFAULT_CANDIDATE_ORIGIN_AIRPORTS: readonly CandidateOriginAirport[] = [
  // 東亞 / 東南亞
  { iata: "NRT", city: "Tokyo", country: "Japan" },
  { iata: "SIN", city: "Singapore", country: "Singapore" },
  // 美洲
  { iata: "LAX", city: "Los Angeles", country: "United States" },
  // 歐洲
  { iata: "LHR", city: "London", country: "United Kingdom" },
  // 中東
  { iata: "DXB", city: "Dubai", country: "United Arab Emirates" },
  // 大洋洲
  { iata: "SYD", city: "Sydney", country: "Australia" },
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
