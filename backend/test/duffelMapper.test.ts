import { describe, it, expect } from "vitest";
import { buildCandidateOrigins, mapDuffelOfferToFlightOffer } from "../src/duffel/mapper.js";
import type { CandidateOriginAirport } from "../src/duffel/candidateOrigins.js";
import type { RawDuffelOffer } from "../src/duffel/types.js";
import type { FlightOffer } from "../src/types/flight.js";

const nrt: CandidateOriginAirport = { iata: "NRT", city: "Tokyo", country: "Japan" };

function makeRawOffer(overrides: Partial<RawDuffelOffer> = {}): RawDuffelOffer {
  return {
    id: "off_123",
    total_amount: "4200.00",
    total_currency: "TWD",
    owner: { iata_code: "ZZ", name: "Duffel Airways" },
    slices: [
      {
        segments: [
          {
            operating_carrier: { iata_code: "ZZ" },
            flight_number: "100",
            departing_at: "2026-11-05T09:00:00",
            arriving_at: "2026-11-05T12:00:00",
            origin: { iata_code: "NRT" },
            destination: { iata_code: "TPE" },
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("mapDuffelOfferToFlightOffer", () => {
  it("正確轉換必填與可計算欄位", () => {
    const offer = mapDuffelOfferToFlightOffer(makeRawOffer(), nrt, "TPE");

    expect(offer.origin).toBe("NRT");
    expect(offer.originCity).toBe("Tokyo");
    expect(offer.originCountry).toBe("Japan");
    expect(offer.price).toBe(4200);
    expect(offer.currency).toBe("TWD");
    expect(offer.airlines).toEqual(["ZZ"]);
    expect(offer.departureAt).toBe("2026-11-05T09:00:00");
    expect(offer.arrivalAt).toBe("2026-11-05T12:00:00");
    expect(offer.durationMinutes).toBe(180);
    expect(offer.stopovers).toBe(0);
    expect(offer.bookingToken).toBe("off_123");
    expect(offer.deepLink).toBeUndefined();
    expect(offer.segments).toHaveLength(1);
    expect(offer.segments[0]).toEqual({
      airlineIata: "ZZ",
      flightNumber: 100,
      departureAirport: "NRT",
      arrivalAirport: "TPE",
      departureAt: "2026-11-05T09:00:00",
      arrivalAt: "2026-11-05T12:00:00",
    });
    expect(offer.flightStatus).toEqual({ status: "not-checked" });
  });

  it("多航段時轉機次數與飛行時長依第一段出發、最後一段抵達計算", () => {
    const raw = makeRawOffer({
      slices: [
        {
          segments: [
            {
              operating_carrier: { iata_code: "ZZ" },
              flight_number: "100",
              departing_at: "2026-11-05T09:00:00",
              arriving_at: "2026-11-05T11:00:00",
              origin: { iata_code: "NRT" },
              destination: { iata_code: "HKG" },
            },
            {
              operating_carrier: { iata_code: "ZZ" },
              flight_number: "200",
              departing_at: "2026-11-05T13:00:00",
              arriving_at: "2026-11-05T15:00:00",
              origin: { iata_code: "HKG" },
              destination: { iata_code: "TPE" },
            },
          ],
        },
      ],
    });

    const offer = mapDuffelOfferToFlightOffer(raw, nrt, "TPE");

    expect(offer.stopovers).toBe(1);
    expect(offer.durationMinutes).toBe(360); // 09:00 -> 15:00
  });

  it("有 expires_at 時帶入 priceExpiresAt", () => {
    const offer = mapDuffelOfferToFlightOffer(makeRawOffer({ expires_at: "2026-11-06T00:00:00Z" }), nrt, "TPE");
    expect(offer.priceExpiresAt).toBe("2026-11-06T00:00:00Z");
  });
});

describe("buildCandidateOrigins (duffel)", () => {
  function makeOffer(origin: string, price: number): FlightOffer {
    return {
      origin,
      originCity: origin,
      originCountry: "",
      price,
      currency: "TWD",
      airlines: ["ZZ"],
      departureAt: "2026-11-05T09:00:00.000Z",
      segments: [],
      flightStatus: { status: "not-checked" },
    };
  }

  it("同一出發地只保留最便宜的一筆，並依價格排序截斷", () => {
    const result = buildCandidateOrigins(
      [makeOffer("NRT", 5000), makeOffer("NRT", 4200), makeOffer("ICN", 3000)],
      1,
    );
    expect(result).toEqual([expect.objectContaining({ origin: "ICN", price: 3000 })]);
  });
});
