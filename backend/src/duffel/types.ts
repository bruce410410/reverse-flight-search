/** Duffel `/air/offer_requests` 回應的原始型別（僅列出我們實際使用的欄位）。 */
export interface RawDuffelAirport {
  iata_code: string;
}

export interface RawDuffelCarrier {
  iata_code: string;
  name?: string;
}

export interface RawDuffelSegment {
  operating_carrier: RawDuffelCarrier;
  /** Duffel 回傳的班號是字串（例如 "100"），我們內部統一轉成 number */
  flight_number: string;
  departing_at: string;
  arriving_at: string;
  origin: RawDuffelAirport;
  destination: RawDuffelAirport;
}

export interface RawDuffelSlice {
  segments: RawDuffelSegment[];
}

export interface RawDuffelOffer {
  id: string;
  /** Duffel 的金額欄位是字串（例如 "123.45"），我們內部統一轉成 number */
  total_amount: string;
  total_currency: string;
  owner: RawDuffelCarrier;
  slices: RawDuffelSlice[];
  expires_at?: string;
}

export interface RawDuffelOfferRequestData {
  id: string;
  offers: RawDuffelOffer[];
}

export interface RawDuffelOfferRequestResponse {
  data: RawDuffelOfferRequestData;
}

export interface RawDuffelErrorItem {
  title?: string;
  message?: string;
  type?: string;
  code?: string;
}

export interface RawDuffelErrorResponse {
  errors?: RawDuffelErrorItem[];
}
