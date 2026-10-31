import { describe, it, expect, vi } from "vitest";
import { ReverseSearchService } from "../src/search/reverseSearchService.js";
import { TravelpayoutsHttpError } from "../src/travelpayouts/errors.js"; // 泛用錯誤類別，僅用來驗證「查票失敗時的降級邏輯」，與實際使用中的 provider 無關
import type { CacheStore, CacheEntry } from "../src/cache/cacheStore.js";
import type { FlightSearchClient, FlightValidator } from "../src/search/reverseSearchService.js";
import type { FlightOffer, ReverseSearchQuery } from "../src/types/flight.js";

const query: ReverseSearchQuery = {
  destination: "TPE",
  dateFrom: "2026-11-05",
  dateTo: "2026-11-10",
  tripType: "one-way",
  currency: "TWD",
  maxResults: 20,
};

const sampleOffers: FlightOffer[] = [
  {
    origin: "NRT",
    originCity: "Tokyo",
    originCountry: "Japan",
    price: 4200,
    currency: "TWD",
    airlines: ["CI"],
    departureAt: "2026-11-05T09:00:00.000Z",
    arrivalAt: "2026-11-05T12:00:00.000Z",
    durationMinutes: 180,
    stopovers: 0,
    bookingToken: "token",
    deepLink: "https://www.aviasales.com/?params=NRT0511TPE1",
    segments: [
      {
        airlineIata: "CI",
        flightNumber: 100,
        departureAirport: "NRT",
        arrivalAirport: "TPE",
        departureAt: "2026-11-05T09:00:00.000Z",
        arrivalAt: "2026-11-05T12:00:00.000Z",
      },
    ],
    flightStatus: { status: "not-checked" },
  },
];

function makeCacheStore(entry: CacheEntry<FlightOffer[]> | null, opts: { getThrows?: boolean; setThrows?: boolean } = {}) {
  return {
    get: vi.fn().mockImplementation(async () => {
      if (opts.getThrows) throw new Error("redis get failed");
      return entry;
    }),
    set: vi.fn().mockImplementation(async () => {
      if (opts.setThrows) throw new Error("redis set failed");
    }),
  } as unknown as CacheStore;
}

function makeSearchClient(opts: { offers?: FlightOffer[]; error?: Error } = {}) {
  return {
    searchReverseFlights: vi.fn().mockImplementation(async () => {
      if (opts.error) throw opts.error;
      return opts.offers ?? [];
    }),
  } as unknown as FlightSearchClient;
}

function makeFlightValidator(impl?: (offers: FlightOffer[]) => FlightOffer[]) {
  return {
    validateTopOffers: vi.fn().mockImplementation(async (offers: FlightOffer[]) => (impl ? impl(offers) : offers)),
  } as unknown as FlightValidator;
}

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-10-01T12:00:00.000Z");

describe("ReverseSearchService", () => {
  it("cache miss（無快取）時直接查 Live API 並寫入快取", async () => {
    const cacheStore = makeCacheStore(null);
    const searchClient = makeSearchClient();
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("live");
    expect(result.cache.tier).toBe("fresh");
    expect(searchClient.searchReverseFlights).toHaveBeenCalledTimes(1);
    expect(cacheStore.set).toHaveBeenCalledTimes(1);
  });

  it("cache miss 時會呼叫 flightValidator 對候選出發地做即時校驗，並快取校驗後的結果", async () => {
    const cacheStore = makeCacheStore(null);
    const searchClient = makeSearchClient({ offers: [] });
    const validatedOffers: FlightOffer[] = [
      { ...sampleOffers[0], flightStatus: { status: "confirmed", checkedAt: now.toISOString() } },
    ];
    const flightValidator = makeFlightValidator(() => validatedOffers);
    const service = new ReverseSearchService(cacheStore, searchClient, undefined, flightValidator);

    const result = await service.search(query, now);

    expect(flightValidator.validateTopOffers).toHaveBeenCalledTimes(1);
    expect(result.results).toEqual(validatedOffers);
    expect(cacheStore.set).toHaveBeenCalledWith(expect.any(String), validatedOffers, now.getTime());
  });

  it("未提供 flightValidator 時使用預設 no-op，候選出發地維持不變", async () => {
    const cacheStore = makeCacheStore(null);
    const searchClient = makeSearchClient({ offers: [] });
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);
    expect(result.cache.source).toBe("live");
  });

  it("<=4h：直接使用快取，不呼叫 Travelpayouts API", async () => {
    const cacheStore = makeCacheStore({ data: sampleOffers, cachedAtMs: now.getTime() - 1 * HOUR });
    const searchClient = makeSearchClient();
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("cache-fresh");
    expect(result.cache.tier).toBe("fresh");
    expect(result.results).toEqual(sampleOffers);
    expect(searchClient.searchReverseFlights).not.toHaveBeenCalled();
  });

  it("<=24h：使用快取但附上提示文字，不呼叫 Travelpayouts API", async () => {
    const cacheStore = makeCacheStore({ data: sampleOffers, cachedAtMs: now.getTime() - 10 * HOUR });
    const searchClient = makeSearchClient();
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("cache-with-notice");
    expect(result.cache.tier).toBe("stale-notice");
    expect(result.cache.notice).toContain("小時前");
    expect(searchClient.searchReverseFlights).not.toHaveBeenCalled();
  });

  it("<=48h：強迫校驗，成功時回傳新資料並標記 cache-validated", async () => {
    const cacheStore = makeCacheStore({ data: sampleOffers, cachedAtMs: now.getTime() - 30 * HOUR });
    const searchClient = makeSearchClient({ offers: [] });
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("cache-validated");
    expect(searchClient.searchReverseFlights).toHaveBeenCalledTimes(1);
    expect(cacheStore.set).toHaveBeenCalledTimes(1);
  });

  it("<=48h：強迫校驗失敗時，降級使用舊快取並標記 liveValidationFailed", async () => {
    const cacheStore = makeCacheStore({ data: sampleOffers, cachedAtMs: now.getTime() - 30 * HOUR });
    const searchClient = makeSearchClient({ error: new TravelpayoutsHttpError(500, "upstream down") });
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("cache-with-notice");
    expect(result.cache.tier).toBe("must-validate");
    expect(result.cache.liveValidationFailed).toBe(true);
    expect(result.results).toEqual(sampleOffers);
  });

  it(">48h：捨棄快取，成功即時查詢時視同 live", async () => {
    const cacheStore = makeCacheStore({ data: sampleOffers, cachedAtMs: now.getTime() - 100 * HOUR });
    const searchClient = makeSearchClient({ offers: [] });
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("live");
    expect(searchClient.searchReverseFlights).toHaveBeenCalledTimes(1);
  });

  it(">48h：捨棄快取且即時查詢也失敗時，降級使用過期快取並標記 liveValidationFailed", async () => {
    const cacheStore = makeCacheStore({ data: sampleOffers, cachedAtMs: now.getTime() - 100 * HOUR });
    const searchClient = makeSearchClient({ error: new TravelpayoutsHttpError(500, "upstream down") });
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("cache-with-notice");
    expect(result.cache.tier).toBe("discard");
    expect(result.cache.liveValidationFailed).toBe(true);
    expect(result.results).toEqual(sampleOffers);
  });

  it("Redis 讀取失敗時退化為直接查 Live API，而不是整個請求失敗", async () => {
    const cacheStore = makeCacheStore(null, { getThrows: true });
    const searchClient = makeSearchClient();
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("live");
    expect(searchClient.searchReverseFlights).toHaveBeenCalledTimes(1);
  });

  it("Redis 寫入失敗不影響本次查詢結果", async () => {
    const cacheStore = makeCacheStore(null, { setThrows: true });
    const searchClient = makeSearchClient();
    const service = new ReverseSearchService(cacheStore, searchClient);

    const result = await service.search(query, now);

    expect(result.cache.source).toBe("live");
    expect(result.results).toEqual([]);
  });

  it("完全沒有快取、Live API 又失敗時，錯誤會往上拋", async () => {
    const cacheStore = makeCacheStore(null);
    const searchClient = makeSearchClient({ error: new TravelpayoutsHttpError(500, "upstream down") });
    const service = new ReverseSearchService(cacheStore, searchClient);

    await expect(service.search(query, now)).rejects.toThrow(TravelpayoutsHttpError);
  });
});
