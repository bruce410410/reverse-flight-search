import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { registerHealthRoute } from "../src/routes/health.js";
import type { RedisClient } from "../src/redis/client.js";

function makeFakeRedis(overrides: Partial<RedisClient> = {}): RedisClient {
  return {
    ping: vi.fn().mockResolvedValue({ ok: true, latencyMs: 2 }),
    getState: vi.fn().mockReturnValue("connected"),
    getLastError: vi.fn().mockReturnValue(null),
    connect: vi.fn(),
    disconnect: vi.fn(),
    raw: vi.fn(),
    ...overrides,
  } as unknown as RedisClient;
}

describe("GET /api/health", () => {
  it("回傳 200 與 status=ok，當 Redis 連線正常", async () => {
    const app = Fastify();
    const redis = makeFakeRedis();
    registerHealthRoute(app, { redis });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(body.redis.connected).toBe(true);
    expect(body.redis.state).toBe("connected");
  });

  it("回傳 503 與 status=degraded，當 Redis ping 失敗", async () => {
    const app = Fastify();
    const redis = makeFakeRedis({
      ping: vi.fn().mockResolvedValue({ ok: false, latencyMs: 5000, error: "connect ECONNREFUSED" }),
      getState: vi.fn().mockReturnValue("disconnected"),
    });
    registerHealthRoute(app, { redis });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(503);
    const body = response.json();
    expect(body.status).toBe("degraded");
    expect(body.redis.connected).toBe(false);
    expect(body.redis.error).toBe("connect ECONNREFUSED");
  });

  it("回應內容包含 ISO 格式的 timestamp", async () => {
    const app = Fastify();
    registerHealthRoute(app, { redis: makeFakeRedis() });

    const response = await app.inject({ method: "GET", url: "/api/health" });
    const body = response.json();

    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});
