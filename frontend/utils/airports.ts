export type Region = "asia" | "americas" | "europe" | "oceania";

export interface Airport {
  iata: string;
  region: Region;
  names: { zh: string; en: string; ja: string; ko: string };
}

/**
 * 常見目的地與後端預設候選出發地（backend/src/serpapi/candidateOrigins.ts）的機場清單，
 * 給目的地輸入框的建議清單、城市名稱→機場代碼轉換，以及結果頁的「地區」篩選使用。
 */
export const AIRPORTS: Airport[] = [
  { iata: "TPE", region: "asia", names: { zh: "台北", en: "Taipei", ja: "台北", ko: "타이베이" } },
  { iata: "KHH", region: "asia", names: { zh: "高雄", en: "Kaohsiung", ja: "高雄", ko: "가오슝" } },
  { iata: "NRT", region: "asia", names: { zh: "東京成田", en: "Tokyo Narita", ja: "東京成田", ko: "도쿄 나리타" } },
  { iata: "HND", region: "asia", names: { zh: "東京羽田", en: "Tokyo Haneda", ja: "東京羽田", ko: "도쿄 하네다" } },
  { iata: "KIX", region: "asia", names: { zh: "大阪關西", en: "Osaka Kansai", ja: "大阪関西", ko: "오사카 간사이" } },
  { iata: "FUK", region: "asia", names: { zh: "福岡", en: "Fukuoka", ja: "福岡", ko: "후쿠오카" } },
  { iata: "CTS", region: "asia", names: { zh: "札幌", en: "Sapporo", ja: "札幌", ko: "삿포로" } },
  { iata: "OKA", region: "asia", names: { zh: "沖繩", en: "Okinawa", ja: "沖縄", ko: "오키나와" } },
  { iata: "ICN", region: "asia", names: { zh: "首爾仁川", en: "Seoul Incheon", ja: "ソウル仁川", ko: "서울 인천" } },
  { iata: "PUS", region: "asia", names: { zh: "釜山", en: "Busan", ja: "釜山", ko: "부산" } },
  { iata: "HKG", region: "asia", names: { zh: "香港", en: "Hong Kong", ja: "香港", ko: "홍콩" } },
  { iata: "MFM", region: "asia", names: { zh: "澳門", en: "Macau", ja: "マカオ", ko: "마카오" } },
  { iata: "SIN", region: "asia", names: { zh: "新加坡", en: "Singapore", ja: "シンガポール", ko: "싱가포르" } },
  { iata: "BKK", region: "asia", names: { zh: "曼谷", en: "Bangkok", ja: "バンコク", ko: "방콕" } },
  { iata: "CNX", region: "asia", names: { zh: "清邁", en: "Chiang Mai", ja: "チェンマイ", ko: "치앙마이" } },
  { iata: "KUL", region: "asia", names: { zh: "吉隆坡", en: "Kuala Lumpur", ja: "クアラルンプール", ko: "쿠알라룸푸르" } },
  { iata: "MNL", region: "asia", names: { zh: "馬尼拉", en: "Manila", ja: "マニラ", ko: "마닐라" } },
  { iata: "SGN", region: "asia", names: { zh: "胡志明市", en: "Ho Chi Minh City", ja: "ホーチミン", ko: "호찌민" } },
  { iata: "HAN", region: "asia", names: { zh: "河內", en: "Hanoi", ja: "ハノイ", ko: "하노이" } },
  { iata: "DPS", region: "asia", names: { zh: "峇里島", en: "Bali", ja: "バリ島", ko: "발리" } },
  { iata: "DXB", region: "europe", names: { zh: "杜拜", en: "Dubai", ja: "ドバイ", ko: "두바이" } },
  { iata: "LHR", region: "europe", names: { zh: "倫敦", en: "London", ja: "ロンドン", ko: "런던" } },
  { iata: "CDG", region: "europe", names: { zh: "巴黎", en: "Paris", ja: "パリ", ko: "파리" } },
  { iata: "FRA", region: "europe", names: { zh: "法蘭克福", en: "Frankfurt", ja: "フランクフルト", ko: "프랑크푸르트" } },
  { iata: "AMS", region: "europe", names: { zh: "阿姆斯特丹", en: "Amsterdam", ja: "アムステルダム", ko: "암스테르담" } },
  { iata: "FCO", region: "europe", names: { zh: "羅馬", en: "Rome", ja: "ローマ", ko: "로마" } },
  { iata: "BCN", region: "europe", names: { zh: "巴塞隆納", en: "Barcelona", ja: "バルセロナ", ko: "바르셀로나" } },
  { iata: "IST", region: "europe", names: { zh: "伊斯坦堡", en: "Istanbul", ja: "イスタンブール", ko: "이스탄불" } },
  { iata: "LAX", region: "americas", names: { zh: "洛杉磯", en: "Los Angeles", ja: "ロサンゼルス", ko: "로스앤젤레스" } },
  { iata: "SFO", region: "americas", names: { zh: "舊金山", en: "San Francisco", ja: "サンフランシスコ", ko: "샌프란시스코" } },
  { iata: "SEA", region: "americas", names: { zh: "西雅圖", en: "Seattle", ja: "シアトル", ko: "시애틀" } },
  { iata: "JFK", region: "americas", names: { zh: "紐約", en: "New York", ja: "ニューヨーク", ko: "뉴욕" } },
  { iata: "YVR", region: "americas", names: { zh: "溫哥華", en: "Vancouver", ja: "バンクーバー", ko: "밴쿠버" } },
  { iata: "SYD", region: "oceania", names: { zh: "雪梨", en: "Sydney", ja: "シドニー", ko: "시드니" } },
  { iata: "MEL", region: "oceania", names: { zh: "墨爾本", en: "Melbourne", ja: "メルボルン", ko: "멜버른" } },
  { iata: "BNE", region: "oceania", names: { zh: "布里斯本", en: "Brisbane", ja: "ブリスベン", ko: "브리즈번" } },
  { iata: "AKL", region: "oceania", names: { zh: "奧克蘭", en: "Auckland", ja: "オークランド", ko: "오클랜드" } },
];

const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

/** 額外的城市別名（使用者常打的簡稱）→ 機場代碼。 */
const ALIASES: Record<string, string> = {
  東京: "NRT", 东京: "NRT", tokyo: "NRT", 大阪: "KIX", osaka: "KIX", 京都: "KIX", kyoto: "KIX",
  首爾: "ICN", 首尔: "ICN", seoul: "ICN", 서울: "ICN", ソウル: "ICN", 台北: "TPE", 臺北: "TPE", taipei: "TPE",
  타이베이: "TPE", 倫敦: "LHR", london: "LHR", 紐約: "JFK", "new york": "JFK", 巴黎: "CDG", paris: "CDG",
};

export function findAirport(iata: string): Airport | undefined {
  return BY_IATA.get(iata.toUpperCase());
}

/**
 * 把使用者輸入（「TPE」「台北」「Taipei」「台北 (TPE)」）轉成 3 碼機場代碼；認不得回傳 null。
 * 任何 3 個英文字母都直接當成機場代碼放行，讓清單以外的機場也能查。
 */
export function resolveDestination(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const inParens = raw.match(/\(([A-Za-z]{3})\)\s*$/);
  if (inParens) return inParens[1].toUpperCase();
  if (/^[A-Za-z]{3}$/.test(raw)) return raw.toUpperCase();

  const key = raw.toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  const match = AIRPORTS.find((a) => Object.values(a.names).some((n) => n.toLowerCase() === key));
  if (match) return match.iata;
  const partial = AIRPORTS.find((a) => Object.values(a.names).some((n) => n.toLowerCase().startsWith(key)));
  return partial?.iata ?? null;
}

export function airportName(iata: string, locale: keyof Airport["names"]): string {
  return findAirport(iata)?.names[locale] ?? iata;
}
