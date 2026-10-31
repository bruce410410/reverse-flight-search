import type { FastifyInstance } from "fastify";
import { SerpApiAccountError, type SerpApiAccountSummary } from "../serpapi/account.js";

interface SerpApiAccountDeps {
  fetchAccount: () => Promise<SerpApiAccountSummary>;
}

/**
 * GET /api/serpapi/account
 *
 * 給前端「系統狀態」頁顯示本月剩餘搜尋額度。SerpApi 金鑰只在後端，
 * 所以額度查詢必須經過後端轉手，前端拿不到金鑰本身。
 */
export function registerSerpApiAccountRoute(app: FastifyInstance, deps: SerpApiAccountDeps): void {
  app.get("/api/serpapi/account", async (_request, reply) => {
    try {
      return await deps.fetchAccount();
    } catch (err) {
      if (err instanceof SerpApiAccountError) {
        reply.code(err.statusCode);
        return { error: "serpapi_account_unavailable", message: err.message };
      }
      app.log.error({ err }, "查詢 SerpApi 額度發生未預期錯誤");
      reply.code(500);
      return { error: "internal_error", message: "系統發生未預期的錯誤，請稍後再試" };
    }
  });
}
