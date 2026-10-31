import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DuffelClient } from "../src/duffel/client.js";
import { DuffelAllOriginsFailedError, DuffelHttpError } from "../src/duffel/errors.js";
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
    DUFFEL_API_TOKEN: "duffel_test_token",
    DUFFEL_API_BASE_URL: "https://api.duffel.test",
    DUFFEL_REQUEST_TIMEOUT_MS: 5000,
    // 限定只查兩個候選出發地，避免測試裡要 mock 二十幾組 fetch 回應
    DUFFEL_CANDIDATE_ORIGINS: "NRT,ICN",
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

function offerBody(origin: string, price: string) {
  return {
    data: {
      id: "orq_1",
      offers: [
        {
          id: `off_${origin}`,
          total_amount: price,
          total_currency: "TWD",
          owner: { iata_code: "ZZ" },
          slices: [
            {
              segments: [
                {
                  operating_carrier: { iata_code: "ZZ" },
                  flight_number: "100",
                  departing_at: "2026-11-05T09:00:00",
                  arriving_at: "2026-11-05T12:00:00",
                  origin: { iata_code: origin },
                  destination: { iata_code: "TPE" },
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

describe("DuffelClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("未設定 DUFFEL_API_TOKEN 時直接拋出錯誤，不發送請求", async () => {
    const client = new DuffelClient(makeEnv({ DUFFEL_API_TOKEN: "" }));
    await expect(client.searchReverseFlights(query)).rejects.toThrow(DuffelHttpError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("對每個候選出發地平行送出 POST 請求，並彙整成依價格排序的候選清單", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (url, init) => {
      const body = JSON.parse(String(init?.body)) as { data: { slices: Array<{ origin: string }> } };
      const origin = body.data.slices[0].origin;
      if (origin === "NRT") return jsonResponse(offerBody("NRT", "4200.00"));
      if (origin === "ICN") return jsonResponse(offerBody("ICN", "3000.00"));
      throw new Error(`unexpected origin ${origin}`);
    });

    const client = new DuffelClient(makeEnv());
    const offers = await client.searchReverseFlights(query);

    expect(offers.map((o) => o.origin)).toEqual(["ICN", "NRT"]);
    expect(offers[0].price).toBe(3000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, firstCallInit] = fetchMock.mock.calls[0];
    expect((firstCallInit?.headers as Record<string, string>)["duffel-version"]).toBe("v2");
    expect((firstCallInit?.headers as Record<string, string>).authorization).toBe("Bearer duffel_test_token");
  });

  it("round-trip 查詢會在 slices 裡加入回程", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { data: { slices: Array<{ origin: string; destination: string }> } };
      expect(body.data.slices).toHaveLength(2);
      expect(body.data.slices[1]).toMatchObject({ origin: "TPE" });
      return jsonResponse({ data: { id: "orq_1", offers: [] } });
    });

    const client = new DuffelClient(makeEnv());
    await client.searchReverseFlights({
      ...query,
      tripType: "round-trip",
      returnDateFrom: "2026-11-15",
      returnDateTo: "2026-11-20",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("單一候選出發地失敗不影響其他出發地的結果", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { data: { slices: Array<{ origin: string }> } };
      const origin = body.data.slices[0].origin;
      if (origin === "NRT") return jsonResponse({ errors: [{ message: "internal error" }] }, 500);
      return jsonResponse(offerBody("ICN", "3000.00"));
    });

    const client = new DuffelClient(makeEnv());
    const offers = await client.searchReverseFlights(query);

    expect(offers).toHaveLength(1);
    expect(offers[0].origin).toBe("ICN");
  });

  it("所有候選出發地都失敗時，拋出 DuffelAllOriginsFailedError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async () => jsonResponse({ errors: [{ message: "internal error" }] }, 500));

    const client = new DuffelClient(makeEnv());
    await expect(client.searchReverseFlights(query)).rejects.toThrow(DuffelAllOriginsFailedError);
  });

  it("目的地與候選出發地相同時，會跳過該候選出發地", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async () => jsonResponse(offerBody("NRT", "4200.00")));

    const client = new DuffelClient(makeEnv({ DUFFEL_CANDIDATE_ORIGINS: "NRT,TPE" }));
    await client.searchReverseFlights(query);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
