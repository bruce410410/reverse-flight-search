import { z } from "zod";

/**
 * 環境變數 schema 與驗證。
 * 啟動時就會驗證，設定錯誤會立即讓伺服器啟動失敗並顯示明確錯誤，
 * 而不是等到執行期才在某個功能裡出現隱晦的 undefined 錯誤。
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3011),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(""),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  REDIS_MAX_RETRIES: z.coerce.number().int().min(0).default(10),

  // SerpApi（Google Flights，反向搜票核心邏輯用，目前使用中）。2026-10 第四次改版：
  // Sky-scrapper 免費方案每月只有 50 次且一次只能查一個出發地；SerpApi 免費方案每月
  // 250 次成功搜尋，departure_id 可一次帶多個機場。申請：https://serpapi.com → 註冊 → Dashboard 複製 API key。
  SERPAPI_API_KEY: z.string().optional().default(""),
  SERPAPI_API_BASE_URL: z.string().default("https://serpapi.com"),
  SERPAPI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** 候選出發地（逗號分隔 IATA 代碼），留空用 serpapi/candidateOrigins.ts 的預設 14 個機場。 */
  SERPAPI_CANDIDATE_ORIGINS: z.string().optional().default(""),
  /** 每次請求最多帶幾個出發機場（Google Flights 介面上限 7）。每次搜尋的請求數 = ceil(候選數 / 這個值)。 */
  SERPAPI_MAX_ORIGINS_PER_REQUEST: z.coerce.number().int().min(1).max(7).default(7),
  /** Google Flights 的語系與國家參數。 */
  SERPAPI_HL: z.string().default("en"),
  SERPAPI_GL: z.string().default("tw"),

  // Sky-scrapper（RapidAPI）：保留但目前未啟用（見上方 SerpApi 說明），想換回只要改 server.ts 的 wiring。
  // 背景（見 README「資料來源」）：2026-09 第三次改版：使用者申請
  // Duffel 正式帳號時發現註冊表單強制要求 Company name 與 Country of incorporation，
  // 且國家清單沒有涵蓋台灣（也沒有整個亞洲），改用跟 AeroDataBox 同一個平台
  // （RapidAPI，只需要 email/password）的 Sky-scrapper API。
  SKYSCRAPPER_API_KEY: z.string().optional().default(""),
  SKYSCRAPPER_API_BASE_URL: z.string().default("https://sky-scrapper.p.rapidapi.com"),
  SKYSCRAPPER_API_HOST: z.string().default("sky-scrapper.p.rapidapi.com"),
  SKYSCRAPPER_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  /**
   * 候選出發地機場清單（逗號分隔的 IATA 機場代碼）。
   * 留空時使用程式內建的預設清單（見 skyscrapper/candidateOrigins.ts，
   * 只有 6 個機場——RapidAPI 免費方案每月實際只有 50 次額度（2026-09-22
   * 用真實請求驗證過），刻意縮小候選範圍）。
   */
  SKYSCRAPPER_CANDIDATE_ORIGINS: z.string().optional().default(""),
  /** 機場代碼解析成 skyId/entityId 的快取存活時間（秒），預設 30 天。見 entityResolver.ts。 */
  SKYSCRAPPER_ENTITY_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
  /** Skyscanner 的地區/語系參數，非必填但 API 要求有值；預設英語系市場。 */
  SKYSCRAPPER_MARKET: z.string().default("en-US"),
  SKYSCRAPPER_COUNTRY_CODE: z.string().default("US"),

  // Amadeus for Developers（反向搜票核心邏輯，目前使用中）
  // 申請位置：https://developers.amadeus.com → 免費建立帳號 → My Apps → Create new app
  // 測試環境（AMADEUS_API_BASE_URL 預設值）：免費、無額度限制，使用靜態快取資料
  // 正式環境：改為 https://api.amadeus.com，有免費額度，超過後按量付費
  AMADEUS_CLIENT_ID: z.string().optional().default(""),
  AMADEUS_CLIENT_SECRET: z.string().optional().default(""),
  AMADEUS_API_BASE_URL: z.string().default("https://test.api.amadeus.com"),
  AMADEUS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  AMADEUS_CANDIDATE_ORIGINS: z.string().optional().default(""),

  // Duffel API：保留但目前未啟用（見上方 Sky-scrapper 說明）。若之後想換回
  // Duffel（例如公司剛好在其支援的國家清單內），重新在 server.ts 把 wiring
  // 換回 DuffelClient 即可，模組沒有被刪除，完整背景見 TEST_REPORT_duffel-migration.md。
  DUFFEL_API_TOKEN: z.string().optional().default(""),
  DUFFEL_API_BASE_URL: z.string().default("https://api.duffel.com"),
  DUFFEL_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  DUFFEL_CANDIDATE_ORIGINS: z.string().optional().default(""),

  // Travelpayouts（Aviasales）Data API：保留但目前未啟用（見上方說明）。
  // 若之後想換回真實市場資料，重新在 server.ts 把 wiring 換回 TravelpayoutsClient
  // 即可，模組本身沒有被刪除，完整背景見 TEST_REPORT_travelpayouts-migration.md。
  TRAVELPAYOUTS_API_TOKEN: z.string().optional().default(""),
  TRAVELPAYOUTS_API_BASE_URL: z.string().default("https://api.travelpayouts.com"),
  TRAVELPAYOUTS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  TRAVELPAYOUTS_CANDIDATE_ORIGINS: z.string().optional().default(""),

  // AeroDataBox（即時航班狀態校驗，透過 RapidAPI）
  AERODATABOX_API_KEY: z.string().optional().default(""),
  AERODATABOX_API_BASE_URL: z.string().default("https://aerodatabox.p.rapidapi.com"),
  AERODATABOX_API_HOST: z.string().default("aerodatabox.p.rapidapi.com"),
  AERODATABOX_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  /** 一次搜尋最多對前幾筆候選出發地做即時校驗，避免額度被單次查詢耗盡 */
  AERODATABOX_VALIDATE_TOP_N: z.coerce.number().int().min(0).max(50).default(5),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

/**
 * 讀取並驗證環境變數。結果會被快取，因此可以在多個模組中重複呼叫
 * 而不會重複解析 process.env。
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`環境變數設定錯誤，請檢查 .env：\n${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** 僅供測試使用：清除快取的環境變數，讓每個測試可以注入不同設定。 */
export function __resetEnvCacheForTests(): void {
  cachedEnv = undefined;
}
