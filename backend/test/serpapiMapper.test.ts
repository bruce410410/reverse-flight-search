import { describe, it, expect } from "vitest";
import { buildCandidateOrigins, mapSerpApiItineraryToFlightOffer } from "../src/serpapi/mapper.js";
import type { CandidateOriginAirport } from "../src/serpapi/candidateOrigins.js";
import type { FlightOffer } from "../src/types/flight.js";

const origins = new Map<string, CandidateOriginAirport>([
  ["NRT", { iata: "NRT", city: "Tokyo", country: "Japan" }],
  ["LHR", { iata: "LHR", city: "London", country: "United Kingdom" }],
]);

describe("mapSerpApiItineraryToFlightOffer", () => {
  it("直飛：解析出發地、時間、班號", () => {
    const offer = mapSerpApiItineraryToFlightOffer(
      {
        flights: [
          {
            departure_airport: { id: "NRT", time: "2026-11-05 9:00" },
            arrival_airport: { id: "TPE", time: "2026-11-05 11:30" },
            airline: "Japan Airlines",
            flight_number: "JL 811",
          },
        ],
        total_duration: 210,
        price: 9800,
      },
      origins,
      "TWD",
      "https://www.google.com/travel/flights?x",
    );

    expect(offer).toMatchObject({
      origin: "NRT",
      originCity: "Tokyo",
      price: 9800,
      currency: "TWD",
      airlines: ["JL"],
      departureAt: "2026-11-05T09:00:00",
      arrivalAt: "2026-11-05T11:30:00",
      durationMinutes: 210,
      stopovers: 0,
      deepLink: "https://www.google.com/travel/flights?x",
      flightStatus: { status: "not-checked" },
    });
    expect(offer!.segments).toEqual([
      {
        airlineIata: "JL",
        flightNumber: 811,
        departureAirport: "NRT",
        arrivalAirport: "TPE",
        departureAt: "2026-11-05T09:00:00",
        arrivalAt: "2026-11-05T11:30:00",
      },
    ]);
  });

  it("轉機：stopovers 與多家航空公司", () => {
    const offer = mapSerpApiItineraryToFlightOffer(
      {
        flights: [
          {
            departure_airport: { id: "LHR", time: "2026-11-05 13:30" },
            arrival_airport: { id: "HKG", time: "2026-11-06 09:00" },
            flight_number: "CX 250",
          },
          {
            departure_airport: { id: "HKG", time: "2026-11-06 11:00" },
            arrival_airport: { id: "TPE", time: "2026-11-06 12:45" },
            flight_number: "BR 870",
          },
        ],
        price: 32000,
      },
      origins,
      "TWD",
      undefined,
    );
    expect(offer!.stopovers).toBe(1);
    expect(offer!.airlines).toEqual(["CX", "BR"]);
    expect(offer!.arrivalAt).toBe("2026-11-06T12:45:00");
    expect(offer!.deepLink).toBeUndefined();
  });

  it("班號無法解析時 segments 回傳空陣列，改用航空公司名稱", () => {
    const offer = mapSerpApiItineraryToFlightOffer(
      {
        flights: [
          {
            departure_airport: { id: "NRT", time: "2026-11-05 09:00" },
            arrival_airport: { id: "TPE", time: "2026-11-05 11:30" },
            airline: "Some Air",
          },
        ],
        price: 5000,
      },
      origins,
      "TWD",
      undefined,
    );
    expect(offer!.segments).toEqual([]);
    expect(offer!.airlines).toEqual(["Some Air"]);
  });

  it("缺價格、缺時間或出發地不在候選清單時回傳 null", () => {
    const flight = {
      departure_airport: { id: "NRT", time: "2026-11-05 09:00" },
      arrival_airport: { id: "TPE", time: "2026-11-05 11:30" },
    };
    expect(mapSerpApiItineraryToFlightOffer({ flights: [flight] }, origins, "TWD", undefined)).toBeNull();
    expect(
      mapSerpApiItineraryToFlightOffer(
        { flights: [{ ...flight, departure_airport: { id: "NRT" } }], price: 1 },
        origins,
        "TWD",
        undefined,
      ),
    ).toBeNull();
    expect(
      mapSerpApiItineraryToFlightOffer(
        { flights: [{ ...flight, departure_airport: { id: "CDG", time: "2026-11-05 09:00" } }], price: 1 },
        origins,
        "TWD",
        undefined,
      ),
    ).toBeNull();
    expect(mapSerpApiItineraryToFlightOffer({ flights: [], price: 1 }, origins, "TWD", undefined)).toBeNull();
  });
});

describe("buildCandidateOrigins", () => {
  it("每個出發地只留最便宜一筆並依價格排序", () => {
    const make = (origin: string, price: number) => ({ origin, price }) as FlightOffer;
    const result = buildCandidateOrigins([make("NRT", 9000), make("LHR", 30000), make("NRT", 7000)], 10);
    expect(result.map((o) => [o.origin, o.price])).toEqual([
      ["NRT", 7000],
      ["LHR", 30000],
    ]);
    expect(buildCandidateOrigins([make("NRT", 1), make("LHR", 2)], 1)).toHaveLength(1);
  });
});
