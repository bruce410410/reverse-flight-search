import type { FlightOffer, FlightSegment } from "../types/flight.js";
import type { CandidateOriginAirport } from "./candidateOrigins.js";
import type { RawSerpApiFlightSegment, RawSerpApiItinerary } from "./types.js";

/**
 * 把 SerpApi 一筆 itinerary（best_flights / other_flights 的一個元素）轉成 FlightOffer。
 *
 * 一次請求帶了多個出發機場，所以出發地要從第一段航班的 departure_airport.id 反查，
 * 不在這批候選清單裡的（理論上不會發生）或缺少價格/時間等必要欄位的直接回傳 null，
 * 不編造資料。deepLink 用 search_metadata.google_flights_url，點進去是 Google Flights
 * 的搜尋結果頁（同一批請求的所有結果共用同一個連結）。
 */
export function mapSerpApiItineraryToFlightOffer(
  itinerary: RawSerpApiItinerary,
  originsByIata: ReadonlyMap<string, CandidateOriginAirport>,
  currency: string,
  deepLink: string | undefined,
): FlightOffer | null {
  const flights = itinerary.flights ?? [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  if (!first || !last || typeof itinerary.price !== "number") return null;

  const originIata = first.departure_airport?.id;
  const departureAt = toIsoLocal(first.departure_airport?.time);
  if (!originIata || !departureAt) return null;

  const origin = originsByIata.get(originIata);
  if (!origin) return null;

  const segments = mapSegments(flights);
  const airlines = Array.from(
    new Set(segments.length > 0 ? segments.map((s) => s.airlineIata) : flights.map((f) => f.airline ?? "").filter(Boolean)),
  );

  const offer: FlightOffer = {
    origin: origin.iata,
    originCity: origin.city,
    originCountry: origin.country,
    price: itinerary.price,
    currency,
    airlines,
    departureAt,
    arrivalAt: toIsoLocal(last.arrival_airport?.time),
    durationMinutes: itinerary.total_duration,
    stopovers: flights.length - 1,
    segments,
    flightStatus: { status: "not-checked" },
  };
  if (itinerary.booking_token) offer.bookingToken = itinerary.booking_token;
  if (deepLink) offer.deepLink = deepLink;
  return offer;
}

/**
 * 解析每一段的航班班號（"JL 811" → JL / 811）。任何一段解析失敗就回傳空陣列，
 * 跟 Sky-scrapper 版本一樣：AeroDataBox 校驗寧可跳過，也不要拿錯的班號去查。
 */
function mapSegments(flights: RawSerpApiFlightSegment[]): FlightSegment[] {
  const segments: FlightSegment[] = [];
  for (const f of flights) {
    const match = /^([A-Z0-9]{2})\s*(\d{1,4})$/.exec((f.flight_number ?? "").trim());
    const departureAt = toIsoLocal(f.departure_airport?.time);
    if (!match || !departureAt || !f.departure_airport?.id || !f.arrival_airport?.id) return [];
    segments.push({
      airlineIata: match[1]!,
      flightNumber: Number.parseInt(match[2]!, 10),
      departureAirport: f.departure_airport.id,
      arrivalAirport: f.arrival_airport.id,
      departureAt,
      arrivalAt: toIsoLocal(f.arrival_airport.time),
    });
  }
  return segments;
}

/** "2026-11-05 08:05" → "2026-11-05T08:05:00"（當地時間，跟其他資料源一樣不帶時區）。 */
function toIsoLocal(time: string | undefined): string | undefined {
  if (!time) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return undefined;
  return `${match[1]}T${match[2]!.padStart(2, "0")}:${match[3]}:00`;
}

/** 每個候選出發地只保留最便宜的一筆，依價格排序後取前 maxResults 筆。 */
export function buildCandidateOrigins(offers: FlightOffer[], maxResults: number): FlightOffer[] {
  const cheapestByOrigin = new Map<string, FlightOffer>();

  for (const offer of offers) {
    const existing = cheapestByOrigin.get(offer.origin);
    if (!existing || offer.price < existing.price) {
      cheapestByOrigin.set(offer.origin, offer);
    }
  }

  return Array.from(cheapestByOrigin.values())
    .sort((a, b) => a.price - b.price)
    .slice(0, maxResults);
}
