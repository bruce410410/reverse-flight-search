import { describe, it, expect, beforeEach } from "vitest";
import { loadEnv, __resetEnvCacheForTests } from "../src/config/env.js";

describe("loadEnv", () => {
  beforeEach(() => {
    __resetEnvCacheForTests();
  });

  it("套用預設值，當環境變數缺省時", () => {
    const env = loadEnv({});
    expect(env.PORT).toBe(3001);
    expect(env.HOST).toBe("0.0.0.0");
    expect(env.REDIS_HOST).toBe("localhost");
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.REDIS_MAX_RETRIES).toBe(10);
  });

  it("正確解析並轉型使用者提供的環境變數", () => {
    const env = loadEnv({
      PORT: "4000",
      REDIS_HOST: "redis.internal",
      REDIS_PORT: "6380",
      REDIS_DB: "2",
      NODE_ENV: "production",
    });
    expect(env.PORT).toBe(4000);
    expect(env.REDIS_HOST).toBe("redis.internal");
    expect(env.REDIS_PORT).toBe(6380);
    expect(env.REDIS_DB).toBe(2);
    expect(env.NODE_ENV).toBe("production");
  });

  it("當 NODE_ENV 不是合法值時拋出明確錯誤", () => {
    expect(() => loadEnv({ NODE_ENV: "staging" })).toThrow(/環境變數設定錯誤/);
  });

  it("當 PORT 不是正整數時拋出明確錯誤", () => {
    expect(() => loadEnv({ PORT: "-1" })).toThrow(/環境變數設定錯誤/);
  });

  it("重複呼叫時會回傳快取的結果，而不是重新解析", () => {
    const first = loadEnv({ PORT: "5000" });
    // 即使傳入不同的 source，快取已存在時應該忽略新的輸入。
    const second = loadEnv({ PORT: "6000" });
    expect(second).toBe(first);
    expect(second.PORT).toBe(5000);
  });
});
