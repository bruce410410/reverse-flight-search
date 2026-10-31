export interface RawAmadeusTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  state: string;
}

export interface RawAmadeusSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration: string;
  numberOfStops: number;
}

export interface RawAmadeusItinerary {
  duration: string;
  segments: RawAmadeusSegment[];
}

export interface RawAmadeusFlightOffer {
  itineraries: RawAmadeusItinerary[];
  price: {
    currency: string;
    total: string;
    grandTotal?: string;
  };
}

export interface RawAmadeusSearchResponse {
  data?: RawAmadeusFlightOffer[];
  errors?: Array<{ status: number; code: number; title: string; detail?: string }>;
}
