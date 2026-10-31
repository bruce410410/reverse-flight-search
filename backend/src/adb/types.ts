/**
 * AeroDataBox API 的原始回應型別（僅列出本系統實際使用的欄位）。
 *
 * 依據 AeroDataBox 公開文件（RapidAPI: aerodatabox.p.rapidapi.com，
 * endpoint: GET /flights/number/{number}/{date}）整理。與 Kiwi client 相同，
 * 本環境沒有可用的正式訂閱金鑰做即時串接驗證，串接正式環境時建議先用一組
 * 已知航班比對這裡的型別是否與實際回應一致。
 */
export type RawAeroDataBoxStatus =
  | "Unknown"
  | "Expected"
  | "EnRoute"
  | "CheckIn"
  | "Boarding"
  | "GateClosed"
  | "Departed"
  | "Delayed"
  | "Approaching"
  | "Landed"
  | "Diverted"
  | "CancelledUncertain"
  | "Cancelled"
  | "Unstated";

export interface RawAeroDataBoxTime {
  utc?: string;
  local?: string;
}

export interface RawAeroDataBoxAirportRef {
  icao?: string;
  iata?: string;
  name?: string;
}

export interface RawAeroDataBoxFlightLeg {
  airport?: RawAeroDataBoxAirportRef;
  scheduledTime?: RawAeroDataBoxTime;
  actualTime?: RawAeroDataBoxTime;
  terminal?: string;
  gate?: string;
}

export interface RawAeroDataBoxFlight {
  number: string;
  status: RawAeroDataBoxStatus;
  departure: RawAeroDataBoxFlightLeg;
  arrival: RawAeroDataBoxFlightLeg;
  airline?: { name?: string; iata?: string };
  aircraft?: { model?: string };
}

export type RawAeroDataBoxSearchResponse = RawAeroDataBoxFlight[];

export interface RawAeroDataBoxErrorResponse {
  message?: string;
  error?: string;
}
