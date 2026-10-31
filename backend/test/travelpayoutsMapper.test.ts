import { describe, it, expect } from "vitest";
import { buildCandidateOrigins, mapTravelpayoutsEntryToOffer } from "../src/travelpayouts/mapper.js";
import type { CandidateOriginAirport } from "../src/travelpayouts/candidateOrigins.js";
import type { RawTravelpayoutsOfferEntry } from "../src/travelpayouts/types.js";
import type { FlightOffer } from "../src/types/flight.js";

const nrt: CandidateOriginAirport = { iata: "NRT", city: "Tokyo", country: "Japan" };

describe("mapTravelpayoutsEntryToOffer", () => {
  it("正確轉換必填欄位，選填欄位（無資料）留空", () => {
    const entry: RawTravelpayoutsOfferEntry = {
      price: 4200,
      airline: "CI",
      flight_number: 100,
      departure_at: "2026-11-05T09:00:00.000Z",
    };

    const offer = mapTravelpayoutsEntryToOffer(entry, nrt, "TPE", "TWD");

    expect(offer.origin).toBe("NRT");
    expect(offer.originCity).toBe("Tokyo");
    expect(offer.originCountry).toBe("Japan");
    expect(offer.price).toBe(4200);
    expect(offer.currency).toBe("TWD");
    expect(offer.airlines).toEqual(["CI"]);
    expect(offer.departureAt).toBe(entry.departure_at);
    expect(offer.arrivalAt).toBeUndefined();
    expect(offer.durationMinutes).toBeUndefined();
    expect(offer.stopovers).toBeUndefined();
    expect(offer.bookingToken).toBeUndefined();
    expect(offer.deepLink).toContain("NRT0511TPE");
    expect(offer.segments).toEqual([
      {
        airlineIata: "CI",
        flightNumber: 100,
        departureAirport: "NRT",
        arrivalAirport: "TPE",
        departureAt: entry.departure_at,
      },
    ]);
    expect(offer.flightStatus).toEqual({ status: "not-checked" });
  });

  it("有 expires_at 時帶入 priceExpiresAt", () => {
    const entry: RawTravelpayoutsOfferEntry = {
      price: 4200,
      airline: "CI",
      flight_number: 100,
      departure_at: "2026-11-05T09:00:00.000Z",
      expires_at: "2026-11-06T00:00:00.000Z",
    };
    const offer = mapTravelpayoutsEntryToOffer(entry, nrt, "TPE", "TWD");
    expect(offer.priceExpiresAt).toBe("2026-11-06T00:00:00.000Z");
  });
});

describe("buildCandidateOrigins (travelpayouts)", () => {
  function makeOffer(origin: string, price: number): FlightOffer {
    return {
      origin,
      originCity: origin,
      originCountry: "",
      price,
      currency: "TWD",
      airlines: ["CI"],
      departureAt: "2026-11-05T09:00:00.000Z",
      deepLink: "https://example.com",
      segments: [],
      flightStatus: { status: "not-checked" },
    };
  }

  it("同一出發地只保留最便宜的一筆", () => {
    const result = buildCandidateOrigins([makeOffer("NRT", 5000), makeOffer("NRT", 4200)], 20);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(4200);
  });

  it("依價格由低到高排序，並截斷到 maxResults", () => {
    const result = buildCandidateOrigins(
      [makeOffer("NRT", 5000), makeOffer("ICN", 3000), makeOffer("HKG", 4000)],
      2,
    );
    expect(result.map((o) => o.origin)).toEqual(["ICN", "HKG"]);
  });
});
