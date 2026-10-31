import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Redis } from "ioredis";
import { SkyscrapperEntityResolver } from "../src/skyscrapper/entityResolver.js";
import { SkyscrapperEntityResolutionError, SkyscrapperRateLimitError } from "../src/skyscrapper/errors.js";
import type { AppEnv } from "../src/config/env.js";

function makeEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    PORT: 3001,
    HOST: "0.0.0.0",
    NODE_ENV: "test",
    CORS_ORIGIN: "http://localhost:3000",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    REDIS_PASSWORD: "",
    REDIS_DB: 0,
    REDIS_CONNECT_TIMEOUT_MS: 5000,
    REDIS_MAX_RETRIES: 10,
    SKYSCRAPPER_API_KEY: "test-key",
    SKYSCRAPPER_API_BASE_URL: "https://sky-scrapper.test",
    SKYSCRAPPER_API_HOST: "sky-scrapper.test",
    SKYSCRAPPER_REQUEST_TIMEOUT_MS: 5000,
    SKYSCRAPPER_CANDIDATE_ORIGINS: "",
    SKYSCRAPPER_ENTITY_CACHE_TTL_SECONDS: 2_592_000,
    SKYSCRAPPER_MARKET: "en-US",
    SKYSCRAPPER_COUNTRY_CODE: "US",
    DUFFEL_API_TOKEN: "",
    DUFFEL_API_BASE_URL: "https://api.duffel.test",
    DUFFEL_REQUEST_TIMEOUT_MS: 5000,
    DUFFEL_CANDIDATE_ORIGINS: "",
    TRAVELPAYOUTS_API_TOKEN: "",
    TRAVELPAYOUTS_API_BASE_URL: "https://api.travelpayouts.test",
    TRAVELPAYOUTS_REQUEST_TIMEOUT_MS: 5000,
    TRAVELPAYOUTS_CANDIDATE_ORIGINS: "",
    AERODATABOX_API_KEY: "",
    AERODATABOX_API_BASE_URL: "https://aerodatabox.test",
    AERODATABOX_API_HOST: "aerodatabox.test",
    AERODATABOX_REQUEST_TIMEOUT_MS: 5000,
    AERODATABOX_VALIDATE_TOP_N: 5,
    ...overrides,
  };
}

function makeFakeRedis(): Redis {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
  } as unknown as Redis;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("SkyscrapperEntityResolver", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("找到機場層級（skyId 等於 IATA 代碼）的候選項目時，回傳並快取", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: true,
        data: [
          { skyId: "NYCA", entityId: "27537542", navigation: { entityType: "CITY" } },
          { skyId: "NRT", entityId: "95673999", navigation: { entityType: "AIRPORT" } },
        ],
      }),
    );

    const redis = makeFakeRedis();
    const resolver = new SkyscrapperEntityResolver(makeEnv(), redis);
    const result = await resolver.resolve("nrt");

    expect(result).toEqual({ skyId: "NRT", entityId: "95673999" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      "skyscrapper:entity:NRT",
      JSON.stringify(result),
      "EX",
      2_592_000,
    );
  });

  it("第二次解析同一機場時直接命中 Redis 快取，不重新呼叫 API", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({ status: true, data: [{ skyId: "NRT", entityId: "95673999" }] }),
    );

    const redis = makeFakeRedis();
    const resolver = new SkyscrapperEntityResolver(makeEnv(), redis);

    await resolver.resolve("NRT");
    await resolver.resolve("NRT");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("找不到符合的機場層級候選項目時，拋出 SkyscrapperEntityResolutionError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({ status: true, data: [] }));

    const resolver = new SkyscrapperEntityResolver(makeEnv(), makeFakeRedis());
    await expect(resolver.resolve("ZZZ")).rejects.toThrow(SkyscrapperEntityResolutionError);
  });

  it("429 時拋出 SkyscrapperRateLimitError，並讀取 retry-after header", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response("", { status: 429, headers: { "retry-after": "30" } }),
    );

    const resolver = new SkyscrapperEntityResolver(makeEnv(), makeFakeRedis());
    await expect(resolver.resolve("NRT")).rejects.toThrow(SkyscrapperRateLimitError);
  });
});
