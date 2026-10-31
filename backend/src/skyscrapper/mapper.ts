import type { FlightOffer, FlightSegment } from "../types/flight.js";
import type { CandidateOriginAirport } from "./candidateOrigins.js";
import type { RawSkyscrapperItinerary, RawSkyscrapperLeg, RawSkyscrapperSegment } from "./types.js";

/**
 * 把 Sky-scrapper 單一 leg 底下的 segments 轉成內部的 FlightSegment[]。
 *
 * 【2026-09-22 已用真實回應驗證】`flightNumber`（字串）與
 * `marketingCarrier.alternateId`（航空公司 IATA 代碼）的欄位假設已經用
 * 使用者實際打的 searchFlights 回應核對過，是正確的（見 types.ts 檔頭註解）。
 * 這裡保留防禦性寫法（缺資料時回傳空陣列而不是編造 flightNumber）是為了
 * 應付「這個 API 沒有官方 schema 保證」的長期風險——不同航線/航空公司的
 * 回應仍可能缺欄位，AeroDataBox 校驗服務本來就會在 segments 為空時優雅
 * 跳過該筆校驗（見 adb/flightValidationService.ts），好過用假資料去比對
 * 真實的即時航班狀態 API。
 */
function mapSegments(leg: RawSkyscrapperLeg): FlightSegment[] {
  const rawSegments = leg.segments;
  if (!rawSegments || rawSegments.length === 0) return [];

  const segments: FlightSegment[] = [];
  for (const seg of rawSegments) {
    const mapped = mapOneSegment(seg);
    if (mapped) segments.push(mapped);
  }
  return segments;
}

function mapOneSegment(seg: RawSkyscrapperSegment): FlightSegment | null {
  const flightNumberRaw = seg.flightNumber;
  const flightNumber =
    typeof flightNumberRaw === "number"
      ? flightNumberRaw
      : typeof flightNumberRaw === "string"
        ? Number.parseInt(flightNumberRaw.replace(/\D/g, ""), 10)
        : NaN;

  const airlineIata = seg.marketingCarrier?.alternateId ?? seg.marketingCarrier?.iata;

  // 缺航班班號或缺航空公司代碼就不勉強拼湊——寧可讓這個航段從陣列裡消失
  // （整個 offer 可能因此 segments 變空陣列，校驗服務會優雅跳過），也不要
  // 提供一個看起來正常、但其實是猜的假資料。
  if (!airlineIata || Number.isNaN(flightNumber) || !seg.departure) {
    return null;
  }

  return {
    airlineIata,
    flightNumber,
    departureAirport: "",
    arrivalAirport: "",
    departureAt: seg.departure,
    arrivalAt: seg.arrival,
  };
}

/**
 * 把 Sky-scrapper 單一候選出發地查到的一筆原始 itinerary，轉成系統內部的 FlightOffer。
 *
 * 只取去程 leg（legs[0]）；來回程時 legs[1] 是回程，目前不特別處理
 * （跟 Duffel／Travelpayouts 版本一樣，反向搜尋主要呈現的是「去程」候選出發地）。
 *
 * deepLink 沒有對應資料——Sky-scrapper 是非官方的資料查詢 API，沒有提供可以
 * 直接導去訂票的頁面連結（跟 Duffel 版本一樣缺席，原因不同：Duffel 是純
 * 開發者 API 本來就沒有消費者頁面，這裡則是這個特定 API 沒有提供）。
 */
export function mapSkyscrapperItineraryToFlightOffer(
  itinerary: RawSkyscrapperItinerary,
  originAirport: CandidateOriginAirport,
  destination: string,
): FlightOffer | null {
  const leg = itinerary.legs?.[0];
  if (!leg || itinerary.price?.raw === undefined) return null;

  const segments = mapSegments(leg);
  const marketingCarriers = leg.carriers?.marketing ?? [];
  const airlines = marketingCarriers.map((c) => c.alternateId ?? c.iata ?? c.name ?? "").filter(Boolean);

  return {
    origin: originAirport.iata,
    originCity: originAirport.city,
    originCountry: originAirport.country,
    price: itinerary.price.raw,
    currency: "", // 由呼叫端（client.ts）依查詢的 currency 參數補上，見該檔案註解
    airlines: airlines.length > 0 ? airlines : ["(未知航空公司)"],
    departureAt: leg.departure ?? "",
    arrivalAt: leg.arrival,
    durationMinutes: leg.durationInMinutes,
    stopovers: leg.stopCount,
    bookingToken: undefined,
    deepLink: undefined,
    priceExpiresAt: undefined,
    segments,
    flightStatus: { status: "not-checked" },
  };
}

/**
 * 把「所有候選出發地各自查到的 offers」彙整成反向搜尋的最終結果：
 *  - 同一出發地若回傳多筆 itinerary，只保留最便宜的一筆
 *  - 依價格由低到高排序
 *  - 截斷到 maxResults 筆
 *
 * 跟 Duffel／Travelpayouts 版本邏輯相同，故意不共用同一份程式碼
 * （見 candidateOrigins.ts 檔頭註解，三個資料源模組刻意互不依賴）。
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
