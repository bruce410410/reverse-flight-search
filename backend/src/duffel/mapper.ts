import type { FlightOffer, FlightSegment } from "../types/flight.js";
import type { CandidateOriginAirport } from "./candidateOrigins.js";
import type { RawDuffelOffer, RawDuffelSegment, RawDuffelSlice } from "./types.js";

function mapSegment(seg: RawDuffelSegment): FlightSegment {
  return {
    airlineIata: seg.operating_carrier.iata_code,
    flightNumber: Number.parseInt(seg.flight_number, 10),
    departureAirport: seg.origin.iata_code,
    arrivalAirport: seg.destination.iata_code,
    departureAt: seg.departing_at,
    arrivalAt: seg.arriving_at,
  };
}

/**
 * 把 Duffel 單一候選出發地查到的一筆原始 offer，轉成系統內部的 FlightOffer。
 *
 * 跟 Travelpayouts 版本相比，Duffel 的測試模式（Duffel Airways）資料完整度
 * 其實更好——有完整的抵達時間、可以算出飛行時長與轉機次數，也有自己的
 * offer id 可以當 bookingToken 用。差別在於這是「結構正確但內容不真實」的
 * 測試資料（航空公司固定是 Duffel Airways／代碼 ZZ，時刻表與價格是隨機產生），
 * 不像 Travelpayouts 是「內容可能真實但結構較簡陋」。兩種資料源的取捨已經
 * 記錄在 README「資料來源」一節。
 *
 * deepLink 沒有對應資料——Duffel 是給開發者串接用的 API，本身沒有公開的
 * 消費者訂票頁面可以連過去（跟 Kiwi／Aviasales 那種本身就是訂票網站不同），
 * 所以這個欄位留空，前端不顯示「前往訂票」連結。
 */
export function mapDuffelOfferToFlightOffer(
  offer: RawDuffelOffer,
  originAirport: CandidateOriginAirport,
  destination: string,
): FlightOffer {
  const outboundSlice: RawDuffelSlice | undefined = offer.slices[0];
  const segments = (outboundSlice?.segments ?? []).map(mapSegment);
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  const durationMinutes =
    firstSegment && lastSegment
      ? Math.round(
          (new Date(lastSegment.arrivalAt ?? lastSegment.departureAt).getTime() -
            new Date(firstSegment.departureAt).getTime()) /
            60_000,
        )
      : undefined;

  return {
    origin: originAirport.iata,
    originCity: originAirport.city,
    originCountry: originAirport.country,
    price: Number.parseFloat(offer.total_amount),
    currency: offer.total_currency,
    airlines: [offer.owner.iata_code],
    departureAt: firstSegment?.departureAt ?? "",
    arrivalAt: lastSegment?.arrivalAt,
    durationMinutes: durationMinutes !== undefined && durationMinutes >= 0 ? durationMinutes : undefined,
    stopovers: segments.length > 0 ? segments.length - 1 : undefined,
    bookingToken: offer.id,
    deepLink: undefined,
    priceExpiresAt: offer.expires_at,
    segments,
    flightStatus: { status: "not-checked" },
  };
}

/**
 * 把「所有候選出發地各自查到的 offers」彙整成反向搜尋的最終結果：
 *  - 同一出發地若因單次請求回傳多個航空公司選項，只保留最便宜的一筆
 *  - 依價格由低到高排序
 *  - 截斷到 maxResults 筆
 */
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
