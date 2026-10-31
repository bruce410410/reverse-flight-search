import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TravelpayoutsClient } from "../src/travelpayouts/client.js";
import { TravelpayoutsAllOriginsFailedError, TravelpayoutsHttpError } from "../src/travelpayouts/errors.js";
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
    SKYSCRAPPER_API_KEY: "",
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
    TRAVELPAYOUTS_API_TOKEN: "test-token",
    TRAVELPAYOUTS_API_BASE_URL: "https://api.travelpayouts.test",
    TRAVELPAYOUTS_REQUEST_TIMEOUT_MS: 5000,
    // 限定只查兩個候選出發地，避免測試裡要 mock 二十幾組 fetch 回應
    TRAVELPAYOUTS_CANDIDATE_ORIGINS: "NRT,ICN",
    AERODATABOX_API_KEY: "",
    AERODATABOX_API_BASE_URL: "https://aerodatabox.test",
    AERODATABOX_API_HOST: "aerodatabox.test",
    AERODATABOX_REQUEST_TIMEOUT_MS: 5000,
    AERODATABOX_VALIDATE_TOP_N: 5,
    ...overrides,
  };
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

describe("TravelpayoutsClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("未設定 TRAVELPAYOUTS_API_TOKEN 時直接拋出錯誤，不發送請求", async () => {
    const client = new TravelpayoutsClient(makeEnv({ TRAVELPAYOUTS_API_TOKEN: "" }));
    await expect(client.searchReverseFlights(query)).rejects.toThrow(TravelpayoutsHttpError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("對每個候選出發地平行發送請求，並彙整成依價格排序的候選清單", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = new URL(String(url));
      const origin = u.searchParams.get("origin");
      if (origin === "NRT") {
        return jsonResponse({
          success: true,
          data: { TPE: { "0": { price: 4200, airline: "CI", flight_number: 100, departure_at: "2026-11-05T09:00:00.000Z" } } },
        });
      }
      if (origin === "ICN") {
        return jsonResponse({
          success: true,
          data: { TPE: { "0": { price: 3000, airline: "BR", flight_number: 200, departure_at: "2026-11-07T09:00:00.000Z" } } },
        });
      }
      throw new Error(`unexpected origin ${origin}`);
    });

    const client = new TravelpayoutsClient(makeEnv());
    const offers = await client.searchReverseFlights(query);

    expect(offers.map((o) => o.origin)).toEqual(["ICN", "NRT"]);
    expect(offers[0].price).toBe(3000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("超出查詢日期範圍的票價選項會被過濾掉", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = new URL(String(url));
      const origin = u.searchParams.get("origin");
      if (origin === "NRT") {
        return jsonResponse({
          success: true,
          data: {
            TPE: {
              "0": { price: 1000, airline: "CI", flight_number: 1, departure_at: "2026-11-30T09:00:00.000Z" }, // 超出 dateTo=2026-11-10
              "1": { price: 4200, airline: "CI", flight_number: 100, departure_at: "2026-11-05T09:00:00.000Z" },
            },
          },
        });
      }
      return jsonResponse({ success: true, data: {} });
    });

    const client = new TravelpayoutsClient(makeEnv());
    const offers = await client.searchReverseFlights(query);

    const nrtOffer = offers.find((o) => o.origin === "NRT");
    expect(nrtOffer?.price).toBe(4200);
  });

  it("單一候選出發地失敗不影響其他出發地的結果", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url) => {
      const u = new URL(String(url));
      const origin = u.searchParams.get("origin");
      if (origin === "NRT") {
        return jsonResponse({ error: "internal error" }, 500);
      }
      return jsonResponse({
        success: true,
        data: { TPE: { "0": { price: 3000, airline: "BR", flight_number: 200, departure_at: "2026-11-07T09:00:00.000Z" } } },
      });
    });

    const client = new TravelpayoutsClient(makeEnv());
    const offers = await client.searchReverseFlights(query);

    expect(offers).toHaveLength(1);
    expect(offers[0].origin).toBe("ICN");
  });

  it("所有候選出發地都失敗時，拋出 TravelpayoutsAllOriginsFailedError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async () => jsonResponse({ error: "internal error" }, 500));

    const client = new TravelpayoutsClient(makeEnv());
    await expect(client.searchReverseFlights(query)).rejects.toThrow(TravelpayoutsAllOriginsFailedError);
  });

  it("目的地與候選出發地相同時，會跳過該候選出發地", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async () =>
      jsonResponse({
        success: true,
        data: { TPE: { "0": { price: 3000, airline: "BR", flight_number: 200, departure_at: "2026-11-07T09:00:00.000Z" } } },
      }),
    );

    const client = new TravelpayoutsClient(makeEnv({ TRAVELPAYOUTS_CANDIDATE_ORIGINS: "NRT,TPE" }));
    await client.searchReverseFlights(query);

    // 只有 NRT 會被查詢，TPE（等於 destination）應該被過濾掉
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
