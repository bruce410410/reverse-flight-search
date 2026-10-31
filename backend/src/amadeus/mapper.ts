import type { FlightOffer, FlightSegment, ReverseSearchQuery } from "../types/flight.js";
import type { CandidateOriginAirport } from "./candidateOrigins.js";
import type { RawAmadeusFlightOffer } from "./types.js";

function parseIsoDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return parseInt(match[1] ?? "0", 10) * 60 + parseInt(match[2] ?? "0", 10);
}

export function mapAmadeusOfferToFlightOffer(
  offer: RawAmadeusFlightOffer,
  origin: CandidateOriginAirport,
  query: ReverseSearchQuery,
): FlightOffer | null {
  const itinerary = offer.itineraries[0];
  if (!itinerary || itinerary.segments.length === 0) return null;

  const price = parseFloat(offer.price.grandTotal ?? offer.price.total);
  if (isNaN(price)) return null;

  const firstSeg = itinerary.segments[0];
  const lastSeg = itinerary.segments[itinerary.segments.length - 1];
  const airlines = [...new Set(itinerary.segments.map((s) => s.carrierCode))];

  const segments: FlightSegment[] = itinerary.segments.map((s) => ({
    airlineIata: s.carrierCode,
    flightNumber: parseInt(s.number, 10),
    departureAirport: s.departure.iataCode,
    arrivalAirport: s.arrival.iataCode,
    departureAt: s.departure.at,
    arrivalAt: s.arrival.at,
  }));

  return {
    origin: origin.iata,
    originCity: origin.city,
    originCountry: origin.country,
    price,
    currency: offer.price.currency,
    airlines,
    departureAt: firstSeg.departure.at,
    arrivalAt: lastSeg.arrival.at,
    durationMinutes: parseIsoDuration(itinerary.duration),
    stopovers: itinerary.segments.length - 1,
    segments,
    flightStatus: { status: "not-checked" },
  };
}
