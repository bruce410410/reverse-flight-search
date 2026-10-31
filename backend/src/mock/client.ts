import type { FlightOffer, ReverseSearchQuery } from "../types/flight.js";

const MOCK_OFFERS: Omit<FlightOffer, "currency">[] = [
  {
    origin: "NRT",
    originCity: "Tokyo",
    originCountry: "Japan",
    price: 3200,
    airlines: ["JL"],
    departureAt: "2026-10-07T09:00:00",
    arrivalAt: "2026-10-07T11:30:00",
    durationMinutes: 150,
    stopovers: 0,
    segments: [
      { airlineIata: "JL", flightNumber: 811, departureAirport: "NRT", arrivalAirport: "TPE", departureAt: "2026-10-07T09:00:00", arrivalAt: "2026-10-07T11:30:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "ICN",
    originCity: "Seoul",
    originCountry: "South Korea",
    price: 4100,
    airlines: ["KE"],
    departureAt: "2026-10-07T11:00:00",
    arrivalAt: "2026-10-07T13:00:00",
    durationMinutes: 120,
    stopovers: 0,
    segments: [
      { airlineIata: "KE", flightNumber: 691, departureAirport: "ICN", arrivalAirport: "TPE", departureAt: "2026-10-07T11:00:00", arrivalAt: "2026-10-07T13:00:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "HKG",
    originCity: "Hong Kong",
    originCountry: "Hong Kong",
    price: 5500,
    airlines: ["CX"],
    departureAt: "2026-10-07T08:30:00",
    arrivalAt: "2026-10-07T10:05:00",
    durationMinutes: 95,
    stopovers: 0,
    segments: [
      { airlineIata: "CX", flightNumber: 404, departureAirport: "HKG", arrivalAirport: "TPE", departureAt: "2026-10-07T08:30:00", arrivalAt: "2026-10-07T10:05:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "SIN",
    originCity: "Singapore",
    originCountry: "Singapore",
    price: 6800,
    airlines: ["SQ"],
    departureAt: "2026-10-07T07:45:00",
    arrivalAt: "2026-10-07T12:15:00",
    durationMinutes: 270,
    stopovers: 0,
    segments: [
      { airlineIata: "SQ", flightNumber: 877, departureAirport: "SIN", arrivalAirport: "TPE", departureAt: "2026-10-07T07:45:00", arrivalAt: "2026-10-07T12:15:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "BKK",
    originCity: "Bangkok",
    originCountry: "Thailand",
    price: 7200,
    airlines: ["TG"],
    departureAt: "2026-10-07T10:20:00",
    arrivalAt: "2026-10-07T16:40:00",
    durationMinutes: 260,
    stopovers: 0,
    segments: [
      { airlineIata: "TG", flightNumber: 634, departureAirport: "BKK", arrivalAirport: "TPE", departureAt: "2026-10-07T10:20:00", arrivalAt: "2026-10-07T16:40:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "SYD",
    originCity: "Sydney",
    originCountry: "Australia",
    price: 14500,
    airlines: ["CI"],
    departureAt: "2026-10-07T06:00:00",
    arrivalAt: "2026-10-07T17:30:00",
    durationMinutes: 570,
    stopovers: 1,
    segments: [
      { airlineIata: "CI", flightNumber: 52, departureAirport: "SYD", arrivalAirport: "TPE", departureAt: "2026-10-07T06:00:00", arrivalAt: "2026-10-07T17:30:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "LAX",
    originCity: "Los Angeles",
    originCountry: "United States",
    price: 18900,
    airlines: ["BR"],
    departureAt: "2026-10-07T23:55:00",
    arrivalAt: "2026-10-09T06:30:00",
    durationMinutes: 750,
    stopovers: 0,
    segments: [
      { airlineIata: "BR", flightNumber: 27, departureAirport: "LAX", arrivalAirport: "TPE", departureAt: "2026-10-07T23:55:00", arrivalAt: "2026-10-09T06:30:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "LHR",
    originCity: "London",
    originCountry: "United Kingdom",
    price: 32000,
    airlines: ["CI", "BR"],
    departureAt: "2026-10-07T13:30:00",
    arrivalAt: "2026-10-08T17:45:00",
    durationMinutes: 855,
    stopovers: 1,
    segments: [
      { airlineIata: "CI", flightNumber: 61, departureAirport: "LHR", arrivalAirport: "TPE", departureAt: "2026-10-07T13:30:00", arrivalAt: "2026-10-08T09:00:00" },
      { airlineIata: "BR", flightNumber: 100, departureAirport: "TPE", arrivalAirport: "LHR", departureAt: "2026-10-08T11:00:00", arrivalAt: "2026-10-08T17:45:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "FRA",
    originCity: "Frankfurt",
    originCountry: "Germany",
    price: 35000,
    airlines: ["LH"],
    departureAt: "2026-10-07T15:00:00",
    arrivalAt: "2026-10-08T18:20:00",
    durationMinutes: 920,
    stopovers: 1,
    segments: [
      { airlineIata: "LH", flightNumber: 722, departureAirport: "FRA", arrivalAirport: "TPE", departureAt: "2026-10-07T15:00:00", arrivalAt: "2026-10-08T18:20:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
  {
    origin: "DXB",
    originCity: "Dubai",
    originCountry: "United Arab Emirates",
    price: 28000,
    airlines: ["EK"],
    departureAt: "2026-10-07T03:20:00",
    arrivalAt: "2026-10-07T16:05:00",
    durationMinutes: 525,
    stopovers: 0,
    segments: [
      { airlineIata: "EK", flightNumber: 384, departureAirport: "DXB", arrivalAirport: "TPE", departureAt: "2026-10-07T03:20:00", arrivalAt: "2026-10-07T16:05:00" },
    ],
    flightStatus: { status: "not-checked" },
  },
];

export class MockFlightClient {
  async searchReverseFlights(query: ReverseSearchQuery): Promise<FlightOffer[]> {
    const offers = MOCK_OFFERS
      .filter((o) => o.origin !== query.destination)
      .map((o) => ({ ...o, currency: query.currency }));

    offers.sort((a, b) => a.price - b.price);
    return offers.slice(0, query.maxResults);
  }
}
