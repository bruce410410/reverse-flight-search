import { describe, it, expect } from "vitest";
import { buildCandidateOrigins, mapSkyscrapperItineraryToFlightOffer } from "../src/skyscrapper/mapper.js";
import type { CandidateOriginAirport } from "../src/skyscrapper/candidateOrigins.js";
import type { RawSkyscrapperItinerary } from "../src/skyscrapper/types.js";
import type { FlightOffer } from "../src/types/flight.js";

const nrt: CandidateOriginAirport = { iata: "NRT", city: "Tokyo", country: "Japan" };

function makeItinerary(overrides: Partial<RawSkyscrapperItinerary> = {}): RawSkyscrapperItinerary {
  return {
    price: { raw: 4200, formatted: "$4,200" },
    legs: [
      {
        origin: { id: "NRT", name: "Tokyo Narita" },
        destination: { id: "TPE", name: "Taipei Taoyuan" },
        departure: "2026-11-05T09:00:00",
        arrival: "2026-11-05T12:00:00",
        durationInMinutes: 180,
        stopCount: 0,
        carriers: { marketing: [{ name: "China Airlines", alternateId: "CI" }] },
      },
    ],
    ...overrides,
  };
}

describe("mapSkyscrapperItineraryToFlightOffer", () => {
  it("正確轉換必填與可取得欄位", () => {
    const offer = mapSkyscrapperItineraryToFlightOffer(makeItinerary(), nrt, "TPE");

    expect(offer).not.toBeNull();
    expect(offer?.origin).toBe("NRT");
    expect(offer?.originCity).toBe("Tokyo");
    expect(offer?.originCountry).toBe("Japan");
    expect(offer?.price).toBe(4200);
    expect(offer?.airlines).toEqual(["CI"]);
    expect(offer?.departureAt).toBe("2026-11-05T09:00:00");
    expect(offer?.arrivalAt).toBe("2026-11-05T12:00:00");
    expect(offer?.durationMinutes).toBe(180);
    expect(offer?.stopovers).toBe(0);
    expect(offer?.deepLink).toBeUndefined();
    expect(offer?.bookingToken).toBeUndefined();
    expect(offer?.flightStatus).toEqual({ status: "not-checked" });
  });

  it("缺少 price.raw 或 legs 時回傳 null，而不是硬塞假資料", () => {
    expect(mapSkyscrapperItineraryToFlightOffer(makeItinerary({ price: undefined }), nrt, "TPE")).toBeNull();
    expect(mapSkyscrapperItineraryToFlightOffer(makeItinerary({ legs: [] }), nrt, "TPE")).toBeNull();
  });

  it("carriers.marketing 缺席時，airlines 退化為佔位文字而不是空陣列", () => {
    const offer = mapSkyscrapperItineraryToFlightOffer(
      makeItinerary({ legs: [{ ...makeItinerary().legs![0], carriers: undefined }] }),
      nrt,
      "TPE",
    );
    expect(offer?.airlines).toEqual(["(未知航空公司)"]);
  });

  it("segments 缺少可信的航班班號時，segments 回傳空陣列（讓 AeroDataBox 校驗優雅跳過）", () => {
    const offer = mapSkyscrapperItineraryToFlightOffer(makeItinerary(), nrt, "TPE");
    expect(offer?.segments).toEqual([]);
  });

  it("segments 提供完整可信欄位時，正確轉換", () => {
    const offer = mapSkyscrapperItineraryToFlightOffer(
      makeItinerary({
        legs: [
          {
            ...makeItinerary().legs![0],
            segments: [
              {
                flightNumber: "CI100",
                departure: "2026-11-05T09:00:00",
                arrival: "2026-11-05T12:00:00",
                marketingCarrier: { alternateId: "CI", name: "China Airlines" },
              },
            ],
          },
        ],
      }),
      nrt,
      "TPE",
    );
    expect(offer?.segments).toHaveLength(1);
    expect(offer?.segments[0]).toMatchObject({
      airlineIata: "CI",
      flightNumber: 100,
      departureAt: "2026-11-05T09:00:00",
      arrivalAt: "2026-11-05T12:00:00",
    });
  });
});

describe("buildCandidateOrigins (skyscrapper)", () => {
  function makeOffer(origin: string, price: number): FlightOffer {
    return {
      origin,
      originCity: origin,
      originCountry: "",
      price,
      currency: "TWD",
      airlines: ["CI"],
      departureAt: "2026-11-05T09:00:00.000Z",
      segments: [],
      flightStatus: { status: "not-checked" },
    };
  }

  it("同一出發地只保留最便宜的一筆，並依價格排序截斷", () => {
    const result = buildCandidateOrigins(
      [makeOffer("NRT", 5000), makeOffer("NRT", 4200), makeOffer("SIN", 3000)],
      1,
    );
    expect(result).toEqual([expect.objectContaining({ origin: "SIN", price: 3000 })]);
  });
});
