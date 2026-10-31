import type { AppEnv } from "../config/env.js";

/** 前端「系統狀態」頁需要的 SerpApi 額度資訊（只挑需要的欄位，不回傳金鑰或帳號 email）。 */
export interface SerpApiAccountSummary {
  planName: string | null;
  searchesPerMonth: number | null;
  thisMonthUsage: number | null;
  searchesLeft: number | null;
}

interface RawSerpApiAccount {
  plan_name?: string;
  searches_per_month?: number;
  this_month_usage?: number;
  plan_searches_left?: number;
  total_searches_left?: number;
  error?: string;
}

export class SerpApiAccountError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
    this.name = "SerpApiAccountError";
  }
}

/**
 * 查詢 SerpApi 帳號額度（GET /account.json）。這個端點不扣搜尋額度，
 * 所以狀態頁每次重新整理都打一次也沒關係。
 */
export async function fetchSerpApiAccount(env: AppEnv): Promise<SerpApiAccountSummary> {
  if (!env.SERPAPI_API_KEY) {
    throw new SerpApiAccountError(503, "尚未設定 SERPAPI_API_KEY");
  }

  const url = `${env.SERPAPI_API_BASE_URL}/account.json?api_key=${encodeURIComponent(env.SERPAPI_API_KEY)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SERPAPI_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    throw new SerpApiAccountError(timedOut ? 504 : 502, timedOut ? "SerpApi 帳號查詢逾時" : "無法連線到 SerpApi");
  } finally {
    clearTimeout(timeout);
  }

  const body = (await response.json().catch(() => ({}))) as RawSerpApiAccount;
  if (!response.ok || body.error) {
    throw new SerpApiAccountError(502, body.error ?? `SerpApi 帳號查詢失敗（HTTP ${response.status}）`);
  }

  return {
    planName: body.plan_name ?? null,
    searchesPerMonth: body.searches_per_month ?? null,
    thisMonthUsage: body.this_month_usage ?? null,
    searchesLeft: body.plan_searches_left ?? body.total_searches_left ?? null,
  };
}
