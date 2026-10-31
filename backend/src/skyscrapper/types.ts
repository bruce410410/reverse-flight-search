/**
 * Sky-scrapper（RapidAPI，非 Skyscanner 官方）API 的原始回應型別。
 *
 * 2026-09-22 更新：使用者用自己申請到的真實 RapidAPI 金鑰，在 RapidAPI 的
 * Test Endpoint 介面上實際打過一次 `searchFlights`（NRT → TPE），並把完整
 * 回應 JSON 貼回來核對。原本標註「推測、未驗證」的 segment 層級欄位
 * （`segments[].flightNumber`、`segments[].marketingCarrier.alternateId`）
 * 這次全部驗證為正確：`flightNumber` 是字串（例如 `"875"`），
 * `marketingCarrier.alternateId` 就是航空公司 IATA 代碼（例如 `"TR"`）。
 * 下面型別上的註解已依此更新，不再標「未驗證」。
 *
 * 另外從這次真實回應觀察到、程式目前沒有處理的兩點：
 *  1. 回應最外層有 `data.context.status`，這次收到的是 `"incomplete"`——
 *     Skyscanner 系列 API 常見的非同步查詢機制（第一次呼叫可能還在背景
 *     蒐集更多報價，可以拿 `context.sessionId` 再打一次同一個端點取得更完整
 *     的結果）。目前 client.ts 只打一次就直接使用回傳的 itineraries，沒有
 *     做輪詢；這次驗證看到 `status: "incomplete"` 時仍然回傳了 10 筆可用的
 *     itinerary，代表單次呼叫至少堪用，但可能不是最終最完整的結果。
 *  2. RapidAPI 的免費 BASIC 方案實際上是**每月 50 次**（`x-ratelimit-requests-limit`
 *     header 顯示 50），不是先前從第三方部落格文章查到的 100 次——這個數字
 *     已經在 candidateOrigins.ts／client.ts／README 一併修正。
 */

/** api/v1/flights/searchAirport 回應中，單一地點候選項目。
 * 實際回應（2026-09 驗證）skyId/entityId 在 navigation.relevantFlightParams 裡，
 * 不在頂層。
 */
export interface RawSkyscrapperAirportCandidate {
  presentation?: {
    title?: string;
    suggestionTitle?: string;
    subtitle?: string;
  };
  navigation?: {
    entityId?: string;
    entityType?: string;
    localizedName?: string;
    relevantFlightParams?: {
      skyId?: string;
      entityId?: string;
      flightPlaceType?: string;
      localizedName?: string;
    };
  };
}

export interface RawSkyscrapperAirportSearchResponse {
  status: boolean;
  data?: RawSkyscrapperAirportCandidate[];
}

/**
 * api/v1/flights/searchFlights 回應中的單一航段（segment）。
 *
 * 【已驗證，2026-09-22】使用者用真實金鑰打過一次 searchFlights（NRT → TPE），
 * 回應裡確認 `flightNumber` 是字串（例如 `"875"`）、`marketingCarrier.alternateId`
 * 就是航空公司 IATA 代碼（例如 `"TR"`）——見 types.ts 檔頭註解的完整說明。
 */
export interface RawSkyscrapperSegment {
  flightNumber?: string | number;
  departure?: string;
  arrival?: string;
  marketingCarrier?: {
    /** 已驗證是 IATA 代碼欄位（見上方檔頭註解） */
    alternateId?: string;
    iata?: string;
    name?: string;
  };
}

/** 單一航程方向（去程或回程）。price/legs 結構有公開範例可對照，算確認過的欄位。 */
export interface RawSkyscrapperLeg {
  origin?: { id?: string; name?: string };
  destination?: { id?: string; name?: string };
  departure?: string;
  arrival?: string;
  durationInMinutes?: number;
  stopCount?: number;
  carriers?: {
    marketing?: Array<{ name?: string; alternateId?: string; iata?: string }>;
  };
  /** 已驗證，見上方 RawSkyscrapperSegment 註解 */
  segments?: RawSkyscrapperSegment[];
}

export interface RawSkyscrapperItinerary {
  price?: {
    raw?: number;
    formatted?: string;
  };
  legs?: RawSkyscrapperLeg[];
}

export interface RawSkyscrapperSearchFlightsResponse {
  status: boolean;
  message?: string;
  data?: {
    itineraries?: RawSkyscrapperItinerary[];
  };
}
