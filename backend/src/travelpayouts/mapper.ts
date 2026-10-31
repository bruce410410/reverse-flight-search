import type { FlightOffer } from "../types/flight.js";
import type { CandidateOriginAirport } from "./candidateOrigins.js";
import type { RawTravelpayoutsOfferEntry } from "./types.js";
import { buildAviasalesDeepLink } from "./deepLink.js";

/**
 * 把 Travelpayouts 單一候選出發地查到的一筆原始票價，轉成系統內部的 FlightOffer。
 *
 * 跟 Kiwi 版本相比，這個資料來源能提供的欄位明顯少很多——`/v1/prices/cheap`
 * 只回傳「這個航班的出發時間、航空公司、班號、價格」，不包含抵達時間、飛行時長、
 * 轉機次數、booking token。這些欄位在 FlightOffer 型別裡已改為 optional
 * （見 types/flight.ts 的異動說明），前端也已同步調整為「沒有資料就不顯示該欄位」，
 * 而不是顯示假造的 0 或 "unknown" 字串。
 *
 * segments 陣列只能建出「起點機場、班號、航空公司、出發時間」這些已知資訊；
 * arrivalAirport 直接用查詢的 destination（合理，因為這是該候選出發地飛往
 * 使用者查詢目的地的那一段），arrivalAt 因為沒有資料所以不填。這不影響
 * AeroDataBox 即時校驗——校驗只依賴 airlineIata / flightNumber / departureAt
 * 的日期部分（見 adb/flightValidationService.ts），完全不用 arrivalAt。
 */
export function mapTravelpayoutsEntryToOffer(
  entry: RawTravelpayoutsOfferEntry,
  originAirport: CandidateOriginAirport,
  destination: string,
  currency: string,
): FlightOffer {
  return {
    origin: originAirport.iata,
    originCity: originAirport.city,
    originCountry: originAirport.country,
    price: entry.price,
    currency,
    airlines: [entry.airline],
    departureAt: entry.departure_at,
    durationMinutes: undefined,
    stopovers: undefined,
    bookingToken: undefined,
    deepLink: buildAviasalesDeepLink({
      origin: originAirport.iata,
      destination,
      departureAt: entry.departure_at,
      returnAt: entry.return_at,
    }),
    priceExpiresAt: entry.expires_at,
    segments: [
      {
        airlineIata: entry.airline,
        flightNumber: entry.flight_number,
        departureAirport: originAirport.iata,
        arrivalAirport: destination,
        departureAt: entry.departure_at,
      },
    ],
    flightStatus: { status: "not-checked" },
  };
}

/**
 * 把「所有候選出發地各自查到的 offers」彙整成反向搜尋的最終結果：
 *  - 同一出發地若因為跨月份查詢等原因出現多筆，只保留最便宜的一筆
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
