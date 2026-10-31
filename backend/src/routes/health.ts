import type { FastifyInstance } from "fastify";
import type { RedisClient } from "../redis/client.js";

interface HealthDeps {
  redis: RedisClient;
}

/**
 * GET /api/health
 *
 * 回傳服務與 Redis 的即時健康狀態。這是「兩段式快取架構」的基礎前提：
 * 若 Redis 不可用，上層的反向搜票邏輯必須知道要整段降級為直接打 Live API，
 * 而不是對著一個壞掉的快取層乾等。
 */
export function registerHealthRoute(app: FastifyInstance, deps: HealthDeps): void {
  app.get("/api/health", async (_request, reply) => {
    const redisPing = await deps.redis.ping();
    const redisState = deps.redis.getState();

    const healthy = redisPing.ok;

    const body = {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      redis: {
        state: redisState,
        connected: redisPing.ok,
        latencyMs: redisPing.latencyMs,
        ...(redisPing.error ? { error: redisPing.error } : {}),
      },
    };

    reply.code(healthy ? 200 : 503);
    return body;
  });
}
