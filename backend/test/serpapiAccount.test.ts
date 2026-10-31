import { describe, it, expect, vi, afterEach } from "vitest";
import Fastify from "fastify";
import { registerSerpApiAccountRoute } from "../src/routes/serpapiAccount.js";
import { fetchSerpApiAccount, SerpApiAccountError } from "../src/serpapi/account.js";
import type { AppEnv } from "../src/config/env.js";

const env = {
  SERPAPI_API_KEY: "test-key",
  SERPAPI_API_BASE_URL: "https://serpapi.test",
  SERPAPI_REQUEST_TIMEOUT_MS: 1000,
} as AppEnv;

afterEach(() => vi.unstubAllGlobals());

describe("fetchSerpApiAccount", () => {
  it("只回傳額度相關欄位", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          account_email: "someone@example.com",
          plan_name: "Free Plan",
          searches_per_month: 250,
          this_month_usage: 6,
          plan_searches_left: 244,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const summary = await fetchSerpApiAccount(env);

    expect(summary).toEqual({ planName: "Free Plan", searchesPerMonth: 250, thisMonthUsage: 6, searchesLeft: 244 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://serpapi.test/account.json?api_key=test-key");
  });

  it("沒有設定金鑰時回報 503", async () => {
    await expect(fetchSerpApiAccount({ ...env, SERPAPI_API_KEY: "" })).rejects.toMatchObject({ statusCode: 503 });
  });

  it("SerpApi 回傳 error 時回報 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Invalid API key." }), { status: 401 })));
    await expect(fetchSerpApiAccount(env)).rejects.toMatchObject({ statusCode: 502, message: "Invalid API key." });
  });
});

describe("GET /api/serpapi/account", () => {
  it("成功時回傳額度摘要", async () => {
    const app = Fastify();
    registerSerpApiAccountRoute(app, {
      fetchAccount: async () => ({ planName: "Free Plan", searchesPerMonth: 250, thisMonthUsage: 6, searchesLeft: 244 }),
    });
    const res = await app.inject({ method: "GET", url: "/api/serpapi/account" });
    expect(res.statusCode).toBe(200);
    expect(res.json().searchesLeft).toBe(244);
  });

  it("查詢失敗時帶狀態碼與訊息", async () => {
    const app = Fastify();
    registerSerpApiAccountRoute(app, {
      fetchAccount: async () => {
        throw new SerpApiAccountError(503, "尚未設定 SERPAPI_API_KEY");
      },
    });
    const res = await app.inject({ method: "GET", url: "/api/serpapi/account" });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: "serpapi_account_unavailable", message: "尚未設定 SERPAPI_API_KEY" });
  });
});
