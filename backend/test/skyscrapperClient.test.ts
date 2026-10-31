import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Redis } from "ioredis";
import { SkyscrapperClient } from "../src/skyscrapper/client.js";
import {
  SkyscrapperAllOriginsFailedError,
  SkyscrapperHttpError,
} from "../src/skyscrapper/errors.js";
import type { AppEnv } from "../src/config/env.js";
import type { ReverseSearchQuery } from "../src/types/flight.js";

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
    // 限定只查兩個候選出發地，避免測試裡要 mock 十幾組 fetch 回應
    SKYSCRAPPER_CANDIDATE_ORIGINS: "NRT,SIN",
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

const query: ReverseSearchQuery = {
  destination: "TPE",
  dateFrom: "2026-11-05",
  dateTo: "2026-11-10",
  tripType: "one-way",
  currency: "TWD",
  maxResults: 20,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** 每個機場代碼都用自己當 skyId/entityId，方便測試裡直接對照。 */
function airportSearchResponse(iata: string) {
  return { status: true, data: [{ skyId: iata, entityId: `entity_${iata}` }] };
}

function searchFlightsResponse(price: number) {
  return {
    status: true,
    data: {
      itineraries: [
        {
          price: { raw: price, formatted: `$${price}` },
          legs: [
            {
              origin: { id: "X" },
              destination: { id: "TPE" },
              departure: "2026-11-05T09:00:00",
              arrival: "2026-11-05T12:00:00",
              durationInMinutes: 180,
              stopCount: 0,
              carriers: { marketing: [{ alternateId: "CI", name: "China Airlines" }] },
            },
          ],
        },
      ],
    },
  };
}

describe("SkyscrapperClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("未設定 SKYSCRAPPER_API_KEY 時直接拋出錯誤，不發送請求", async () => {
    const client = new SkyscrapperClient(makeEnv({ SKYSCRAPPER_API_KEY: "" }), makeFakeRedis());
    await expect(client.searchReverseFlights(query)).rejects.toThrow(SkyscrapperHttpError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("對每個候選出發地解析 entity 並平行查詢，彙整成依價格排序的候選清單", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("searchAirport")) {
        const iata = new URL(u).searchParams.get("query")!;
        return jsonResponse(airportSearchResponse(iata));
      }
      const params = new URL(u).searchParams;
      const originSkyId = params.get("originSkyId");
      if (originSkyId === "NRT") return jsonResponse(searchFlightsResponse(4200));
      if (originSkyId === "SIN") return jsonResponse(searchFlightsResponse(3000));
      throw new Error(`unexpected originSkyId ${originSkyId}`);
    });

    const client = new SkyscrapperClient(makeEnv(), makeFakeRedis());
    const offers = await client.searchReverseFlights(query);

    expect(offers.map((o) => o.origin)).toEqual(["SIN", "NRT"]);
    expect(offers[0].price).toBe(3000);
    expect(offers[0].currency).toBe("TWD");

    // 目的地(TPE) + 2 個候選出發地(NRT, SIN) 的 entity 解析各 1 次，加上 2 次 searchFlights = 5 次
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("單一候選出發地查詢失敗不影響其他出發地的結果", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("searchAirport")) {
        const iata = new URL(u).searchParams.get("query")!;
        return jsonResponse(airportSearchResponse(iata));
      }
      const originSkyId = new URL(u).searchParams.get("originSkyId");
      if (originSkyId === "NRT") return jsonResponse({ message: "internal error" }, 500);
      return jsonResponse(searchFlightsResponse(3000));
    });

    const client = new SkyscrapperClient(makeEnv(), makeFakeRedis());
    const offers = await client.searchReverseFlights(query);

    expect(offers).toHaveLength(1);
    expect(offers[0].origin).toBe("SIN");
  });

  it("所有候選出發地都失敗時，拋出 SkyscrapperAllOriginsFailedError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("searchAirport")) {
        const iata = new URL(u).searchParams.get("query")!;
        return jsonResponse(airportSearchResponse(iata));
      }
      return jsonResponse({ message: "internal error" }, 500);
    });

    const client = new SkyscrapperClient(makeEnv(), makeFakeRedis());
    await expect(client.searchReverseFlights(query)).rejects.toThrow(SkyscrapperAllOriginsFailedError);
  });

  it("目的地與候選出發地相同時，會跳過該候選出發地", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("searchAirport")) {
        const iata = new URL(u).searchParams.get("query")!;
        return jsonResponse(airportSearchResponse(iata));
      }
      return jsonResponse(searchFlightsResponse(4200));
    });

    const client = new SkyscrapperClient(makeEnv({ SKYSCRAPPER_CANDIDATE_ORIGINS: "NRT,TPE" }), makeFakeRedis());
    const offers = await client.searchReverseFlights(query);

    expect(offers.every((o) => o.origin !== "TPE")).toBe(true);
  });

  it("entity 解析結果會被快取，第二次搜尋同樣的候選出發地不會重複呼叫 searchAirport", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("searchAirport")) {
        const iata = new URL(u).searchParams.get("query")!;
        return jsonResponse(airportSearchResponse(iata));
      }
      return jsonResponse(searchFlightsResponse(4200));
    });

    const redis = makeFakeRedis();
    const client = new SkyscrapperClient(makeEnv(), redis);

    await client.searchReverseFlights(query);
    const callsAfterFirst = fetchMock.mock.calls.length;

    await client.searchReverseFlights(query);
    const searchAirportCallsAfterSecond = fetchMock.mock.calls
      .slice(callsAfterFirst)
      .filter(([url]) => String(url).includes("searchAirport"));

    expect(searchAirportCallsAfterSecond).toHaveLength(0);
  });
});
