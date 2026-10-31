import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { AppEnv } from "./config/env.js";
import { RedisClient } from "./redis/client.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerReverseSearchRoute } from "./routes/reverseSearch.js";
import { registerSerpApiAccountRoute } from "./routes/serpapiAccount.js";
import { fetchSerpApiAccount } from "./serpapi/account.js";
import { CacheStore } from "./cache/cacheStore.js";
import { SerpApiClient } from "./serpapi/client.js";
import { ReverseSearchService } from "./search/reverseSearchService.js";
import { createFlightValidationService } from "./adb/flightValidationService.js";

export interface BuiltApp {
  app: FastifyInstance;
  redis: RedisClient;
  reverseSearchService: ReverseSearchService;
}

/**
 * 組裝 Fastify app 與其相依元件。
 * 拆成獨立函式是為了讓測試可以在不啟動真實 HTTP 監聽的情況下，
 * 用 app.inject() 打路由，並注入假的/測試用的 Redis client 或 reverseSearchService。
 */
export function buildApp(
  env: AppEnv,
  redis: RedisClient = new RedisClient(env),
  reverseSearchService: ReverseSearchService = new ReverseSearchService(
    new CacheStore(redis.raw()),
    new SerpApiClient(env),
    { warn: (msg, meta) => fallbackWarnLogger(msg, meta) },
    createFlightValidationService(env, { warn: (msg, meta) => fallbackWarnLogger(msg, meta) }),
  ),
): BuiltApp {
  const app = Fastify({
    logger: {
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
      level: env.NODE_ENV === "test" ? "silent" : "info",
    },
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN,
  });

  registerHealthRoute(app, { redis });
  registerReverseSearchRoute(app, { service: reverseSearchService });
  registerSerpApiAccountRoute(app, { fetchAccount: () => fetchSerpApiAccount(env) });

  app.addHook("onClose", async () => {
    await redis.disconnect().catch(() => {
      // 關閉期間 Redis 若已經斷線，quit() 可能會 reject；此時不需要再處理。
    });
  });

  return { app, redis, reverseSearchService };
}

// 佔位用的簡易 logger：真正的 pino instance 要等 Fastify app 建立後才存在，
// 而 reverseSearchService 的預設值在那之前就要組好，所以先用 console.warn 頂著，
// 避免遺失警告訊息。若呼叫端在意結構化日誌，可自行傳入使用 app.log 的 reverseSearchService。
function fallbackWarnLogger(msg: string, meta?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.warn(`[reverse-search] ${msg}`, meta ?? "");
}
