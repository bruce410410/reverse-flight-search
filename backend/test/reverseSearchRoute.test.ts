import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { registerReverseSearchRoute } from "../src/routes/reverseSearch.js";
import { SkyscrapperRateLimitError, SkyscrapperTimeoutError } from "../src/skyscrapper/errors.js";
import type { ReverseSearchService } from "../src/search/reverseSearchService.js";
import type { ReverseSearchResult } from "../src/types/flight.js";

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function makeService(impl: () => Promise<ReverseSearchResult>) {
  return { search: vi.fn().mockImplementation(impl) } as unknown as ReverseSearchService;
}

describe("POST /api/reverse-search", () => {
  it("回傳 400，當請求格式不合法", async () => {
    const app = Fastify();
    registerReverseSearchRoute(app, { service: makeService(async () => { throw new Error("不應該被呼叫"); }) });

    const response = await app.inject({
      method: "POST",
      url: "/api/reverse-search",
      payload: { destination: "TAIPEI", dateFrom: "bad-date" },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe("invalid_request");
    expect(Array.isArray(body.details)).toBe(true);
  });

  it("回傳 200 與搜尋結果，當請求合法", async () => {
    const app = Fastify();
    const fakeResult: ReverseSearchResult = {
      destination: "TPE",
      queriedAt: "2026-10-01T00:00:00.000Z",
      cache: { source: "live", tier: "fresh", cachedAt: "2026-10-01T00:00:00.000Z", ageMs: 0 },
      results: [],
    };
    registerReverseSearchRoute(app, { service: makeService(async () => fakeResult) });

    const response = await app.inject({
      method: "POST",
      url: "/api/reverse-search",
      payload: {
        destination: "tpe",
        dateFrom: futureDate(10),
        dateTo: futureDate(15),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(fakeResult);
  });

  it("回傳 429 並帶上 Retry-After，當 Sky-scrapper API 頻率超限", async () => {
    const app = Fastify();
    registerReverseSearchRoute(app, {
      service: makeService(async () => {
        throw new SkyscrapperRateLimitError(42);
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reverse-search",
      payload: { destination: "TPE", dateFrom: futureDate(10), dateTo: futureDate(15) },
    });

    expect(response.statusCode).toBe(429);
    expect(response.headers["retry-after"]).toBe("42");
  });

  it("回傳 504，當 Sky-scrapper API 逾時", async () => {
    const app = Fastify();
    registerReverseSearchRoute(app, {
      service: makeService(async () => {
        throw new SkyscrapperTimeoutError(10_000);
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reverse-search",
      payload: { destination: "TPE", dateFrom: futureDate(10), dateTo: futureDate(15) },
    });

    expect(response.statusCode).toBe(504);
  });

  it("回傳 500，當發生未預期的錯誤", async () => {
    const app = Fastify({ logger: false });
    registerReverseSearchRoute(app, {
      service: makeService(async () => {
        throw new Error("boom");
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/reverse-search",
      payload: { destination: "TPE", dateFrom: futureDate(10), dateTo: futureDate(15) },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error).toBe("internal_error");
  });
});
