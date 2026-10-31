import type { FastifyInstance } from "fastify";
import { reverseSearchRequestSchema } from "./reverseSearchSchema.js";
import type { ReverseSearchService } from "../search/reverseSearchService.js";
import {
  SkyscrapperHttpError,
  SkyscrapperNetworkError,
  SkyscrapperRateLimitError,
  SkyscrapperTimeoutError,
  SkyscrapperAllOriginsFailedError,
} from "../skyscrapper/errors.js";
import {
  SerpApiHttpError,
  SerpApiNetworkError,
  SerpApiRateLimitError,
  SerpApiTimeoutError,
  SerpApiAllBatchesFailedError,
} from "../serpapi/errors.js";

interface ReverseSearchDeps {
  service: ReverseSearchService;
}

/**
 * POST /api/reverse-search
 *
 * 目的地導向的反向搜票查詢。請求/回應格式詳見 README 或 types/flight.ts。
 */
export function registerReverseSearchRoute(app: FastifyInstance, deps: ReverseSearchDeps): void {
  app.post("/api/reverse-search", async (request, reply) => {
    const parsed = reverseSearchRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400);
      return {
        error: "invalid_request",
        message: "請求參數不合法",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      };
    }

    try {
      const result = await deps.service.search(parsed.data);
      return result;
    } catch (err) {
      return handleSearchError(err, reply, app);
    }
  });
}

function handleSearchError(err: unknown, reply: import("fastify").FastifyReply, app: FastifyInstance) {
  if (err instanceof SkyscrapperRateLimitError || err instanceof SerpApiRateLimitError) {
    reply.code(429);
    if (err.retryAfterSeconds !== null) {
      reply.header("Retry-After", String(err.retryAfterSeconds));
    }
    return { error: "upstream_rate_limited", message: err.message };
  }

  if (err instanceof SkyscrapperTimeoutError || err instanceof SerpApiTimeoutError) {
    reply.code(504);
    return { error: "upstream_timeout", message: err.message };
  }

  if (err instanceof SkyscrapperNetworkError || err instanceof SerpApiNetworkError) {
    reply.code(502);
    return { error: "upstream_network_error", message: err.message };
  }

  if (
    err instanceof SkyscrapperAllOriginsFailedError ||
    err instanceof SkyscrapperHttpError ||
    err instanceof SerpApiAllBatchesFailedError ||
    err instanceof SerpApiHttpError
  ) {
    // 資料源（SerpApi／Sky-scrapper）端回傳的錯誤，或所有候選出發地都查詢失敗，視為 502：問題出在上游，不是我們的伺服器邏輯。
    reply.code(502);
    return { error: "upstream_error", message: err.message };
  }

  app.log.error({ err }, "反向搜票查詢發生未預期錯誤");
  reply.code(500);
  return { error: "internal_error", message: "系統發生未預期的錯誤，請稍後再試" };
}
