import type { AppEnv } from "../config/env.js";
import type { ReverseSearchQuery, FlightOffer } from "../types/flight.js";
import { resolveCandidateOrigins, type CandidateOriginAirport } from "./candidateOrigins.js";
import { mapAmadeusOfferToFlightOffer } from "./mapper.js";
import type { RawAmadeusSearchResponse, RawAmadeusTokenResponse } from "./types.js";
import {
  AmadeusAllOriginsFailedError,
  AmadeusHttpError,
  AmadeusNetworkError,
  AmadeusTimeoutError,
} from "./errors.js";

export class AmadeusClient {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly env: AppEnv) {}

  async searchReverseFlights(query: ReverseSearchQuery): Promise<FlightOffer[]> {
    if (!this.env.AMADEUS_CLIENT_ID || !this.env.AMADEUS_CLIENT_SECRET) {
      throw new AmadeusHttpError(401, "尚未設定 AMADEUS_CLIENT_ID 或 AMADEUS_CLIENT_SECRET");
    }

    const token = await this.getToken();
    const candidateOrigins = resolveCandidateOrigins(this.env.AMADEUS_CANDIDATE_ORIGINS).filter(
      (airport) => airport.iata !== query.destination,
    );

    const settled = await Promise.allSettled(
      candidateOrigins.map((origin) => this.fetchOneOrigin(origin, query, token)),
    );

    const offers: FlightOffer[] = [];
    const failures: unknown[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        offers.push(...result.value);
      } else {
        failures.push(result.reason);
      }
    }

    if (offers.length === 0 && failures.length > 0 && failures.length === settled.length) {
      throw new AmadeusAllOriginsFailedError(failures);
    }

    offers.sort((a, b) => a.price - b.price);
    return offers.slice(0, query.maxResults);
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.token;
    }

    const response = await fetch(`${this.env.AMADEUS_API_BASE_URL}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.env.AMADEUS_CLIENT_ID,
        client_secret: this.env.AMADEUS_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AmadeusHttpError(response.status, `OAuth token 取得失敗：${body || response.statusText}`);
    }

    const data = (await response.json()) as RawAmadeusTokenResponse;
    this.tokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
    return data.access_token;
  }

  private async fetchOneOrigin(
    origin: CandidateOriginAirport,
    query: ReverseSearchQuery,
    token: string,
  ): Promise<FlightOffer[]> {
    const params = new URLSearchParams({
      originLocationCode: origin.iata,
      destinationLocationCode: query.destination,
      departureDate: query.dateFrom,
      adults: "1",
      currencyCode: query.currency,
      max: "1",
    });

    if (query.tripType === "round-trip" && query.returnDateFrom) {
      params.set("returnDate", query.returnDateFrom);
    }

    const url = `${this.env.AMADEUS_API_BASE_URL}/v2/shopping/flight-offers?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.AMADEUS_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new AmadeusTimeoutError(this.env.AMADEUS_REQUEST_TIMEOUT_MS);
      }
      throw new AmadeusNetworkError(`無法連線到 Amadeus API（origin=${origin.iata}）`, err);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AmadeusHttpError(response.status, `origin=${origin.iata}: ${body || response.statusText}`);
    }

    const parsed = (await response.json()) as RawAmadeusSearchResponse;
    return (parsed.data ?? [])
      .map((offer) => mapAmadeusOfferToFlightOffer(offer, origin, query))
      .filter((offer): offer is FlightOffer => offer !== null);
  }
}
