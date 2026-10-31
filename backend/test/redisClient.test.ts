import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RedisClient } from "../src/redis/client.js";
import { loadEnv, __resetEnvCacheForTests } from "../src/config/env.js";

/**
 * 這些測試連到一個「真的」但故意指向錯誤 port 的 Redis 設定，
 * 用來驗證重試策略與錯誤回報邏輯，而不需要 mock ioredis 內部行為
 * （mock 一個有狀態機、事件驅動的 client 容易產生假陽性）。
 */
describe("RedisClient", () => {
  beforeEach(() => {
    __resetEnvCacheForTests();
  });

  afterEach(() => {
    __resetEnvCacheForTests();
  });

  it("連線失敗時，ping() 回報 ok=false 並附上錯誤訊息", async () => {
    const env = loadEnv({
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: "1", // 保留的 port，保證連不上，快速觸發錯誤而不是逾時等待
      REDIS_MAX_RETRIES: "0",
      REDIS_CONNECT_TIMEOUT_MS: "500",
    });
    const client = new RedisClient(env);

    const result = await client.ping();

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();

    await client.disconnect().catch(() => {});
  }, 10_000);

  it("retryStrategy 在超過 REDIS_MAX_RETRIES 後回傳 null 以停止重連", () => {
    const env = loadEnv({ REDIS_MAX_RETRIES: "3" });
    const client = new RedisClient(env);
    const options = (client.raw() as unknown as { options: { retryStrategy: (a: number) => number | null } })
      .options;

    expect(options.retryStrategy(1)).not.toBeNull();
    expect(options.retryStrategy(3)).not.toBeNull();
    expect(options.retryStrategy(4)).toBeNull();
  });

  it("retryStrategy 採用指數退避且不超過 10 秒上限", () => {
    const env = loadEnv({ REDIS_MAX_RETRIES: "20" });
    const client = new RedisClient(env);
    const options = (client.raw() as unknown as { options: { retryStrategy: (a: number) => number | null } })
      .options;

    const delayAt10 = options.retryStrategy(10);
    expect(delayAt10).not.toBeNull();
    expect(delayAt10 as number).toBeLessThanOrEqual(10_200); // 10s + 最大 200ms 抖動
  });

  it("getState() 初始狀態為 connecting", () => {
    const env = loadEnv({});
    const client = new RedisClient(env);
    expect(client.getState()).toBe("connecting");
  });
});
