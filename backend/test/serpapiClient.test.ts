import { describe, it, expect, vi, afterEach } from "vitest";
import { SerpApiClient } from "../src/serpapi/client.js";
import {
  SerpApiAllBatchesFailedError,
  SerpApiHttpError,
  SerpApiRateLimitError,
} from "../src/serpapi/errors.js";
import type { AppEnv } from "../src/config/env.js";
import type { ReverseSearchQuery } from "../src/types/flight.js";

function makeEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    SERPAPI_API_KEY: "test-key",
    SERPAPI_API_BASE_URL: "https://serpapi.test",
    SERPAPI_REQUEST_TIMEOUT_MS: 5000,
    SERPAPI_CANDIDATE_ORIGINS: "NRT,SIN,LHR",
    SERPAPI_MAX_ORIGINS_PER_REQUEST: 2,
    SERPAPI_HL: "en",
    SERPAPI_GL: "tw",
    ...overrides,
  } as AppEnv;
}

const query: ReverseSearchQuery = {
  destination: "TPE",
  dateFrom: "2026-11-05",
  dateTo: "2026-11-10",
  tripType: "one-way",
  currency: "TWD",
  maxResults: 20,
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function itinerary(origin: string, price: number, flightNumber = "XX 1") {
  return {
    flights: [
      {
        departure_airport: { id: origin, time: "2026-11-05 08:00" },
        arrival_airport: { id: "TPE", time: "2026-11-05 12:00" },
        flight_number: flightNumber,
      },
    ],
    total_duration: 240,
    price,
  };
}

function searchUrl(call: unknown[]): URL {
  return new URL(String(call[0]));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SerpApiClient", () => {
  it("候選出發地依批次大小切分，每批一次請求，結果依出發地取最便宜並排序", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.searchParams.get("departure_id") === "NRT,SIN") {
        return jsonResponse({
          search_metadata: { google_flights_url: "https://g.test/a" },
          best_flights: [itinerary("NRT", 9000, "JL 811")],
          other_flights: [itinerary("NRT", 7000, "MM 627"), itinerary("SIN", 12000, "SQ 876")],
        });
      }
      return jsonResponse({ best_flights: [itinerary("LHR", 30000, "BR 68")] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const offers = await new SerpApiClient(makeEnv()).searchReverseFlights(query);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = searchUrl(fetchMock.mock.calls[0]!);
    expect(first.pathname).toBe("/search.json");
    expect(first.searchParams.get("engine")).toBe("google_flights");
    expect(first.searchParams.get("arrival_id")).toBe("TPE");
    expect(first.searchParams.get("outbound_date")).toBe("2026-11-05");
    expect(first.searchParams.get("type")).toBe("2");
    expect(first.searchParams.get("currency")).toBe("TWD");
    expect(first.searchParams.get("api_key")).toBe("test-key");
    expect(first.searchParams.has("return_date")).toBe(false);

    expect(offers.map((o) => [o.origin, o.price])).toEqual([
      ["NRT", 7000],
      ["SIN", 12000],
      ["LHR", 30000],
    ]);
    expect(offers[0]!.deepLink).toBe("https://g.test/a");
  });

  it("來回票帶 type=1 與 return_date", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ best_flights: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await new SerpApiClient(makeEnv({ SERPAPI_CANDIDATE_ORIGINS: "NRT" })).searchReverseFlights({
      ...query,
      tripType: "round-trip",
      returnDateFrom: "2026-11-12",
      returnDateTo: "2026-11-15",
    });

    const url = searchUrl(fetchMock.mock.calls[0]!);
    expect(url.searchParams.get("type")).toBe("1");
    expect(url.searchParams.get("return_date")).toBe("2026-11-12");
  });

  it("目的地本身會從候選出發地排除", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ best_flights: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await new SerpApiClient(makeEnv({ SERPAPI_CANDIDATE_ORIGINS: "TPE,NRT" })).searchReverseFlights(query);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(searchUrl(fetchMock.mock.calls[0]!).searchParams.get("departure_id")).toBe("NRT");
  });

  it("單一批次失敗不影響其他批次", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      if (url.searchParams.get("departure_id") === "NRT,SIN") return jsonResponse({ error: "boom" }, 500);
      return jsonResponse({ best_flights: [itinerary("LHR", 30000)] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const offers = await new SerpApiClient(makeEnv()).searchReverseFlights(query);
    expect(offers.map((o) => o.origin)).toEqual(["LHR"]);
  });

  it("「查無結果」的 error 欄位視為空結果而非錯誤", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "Google Flights hasn't returned any results for this query." })),
    );

    await expect(new SerpApiClient(makeEnv()).searchReverseFlights(query)).resolves.toEqual([]);
  });

  it("所有批次都 429 時拋出 SerpApiRateLimitError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "Your account has run out of searches." }, 429, { "retry-after": "60" })),
    );

    const err = await new SerpApiClient(makeEnv()).searchReverseFlights(query).catch((e) => e);
    expect(err).toBeInstanceOf(SerpApiRateLimitError);
    expect(err.retryAfterSeconds).toBe(60);
  });

  it("所有批次都失敗（非 429）時拋出 SerpApiAllBatchesFailedError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "Invalid API key." }, 401)));

    await expect(new SerpApiClient(makeEnv()).searchReverseFlights(query)).rejects.toBeInstanceOf(
      SerpApiAllBatchesFailedError,
    );
  });

  it("沒有設定金鑰時直接拋錯，不發出請求", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new SerpApiClient(makeEnv({ SERPAPI_API_KEY: "" })).searchReverseFlights(query),
    ).rejects.toBeInstanceOf(SerpApiHttpError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
