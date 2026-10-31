# 測試報告 — 資料來源第三次改版：Duffel → Sky-scrapper（RapidAPI）

日期：2026-09-22
範圍：`skyscrapper/`（新模組，取代 server.ts 裡的 Duffel wiring）、`config/env.ts`、`server.ts`、`routes/reverseSearch.ts`、`types/flight.ts`

## 一、觸發原因

使用者實際申請 Duffel 正式帳號時發現：註冊表單強制要求「Company name」與「Country of incorporation」兩個必填欄位，而「Country of incorporation」下拉選單只列了約 30 個國家/地區（清一色歐盟、英國、美國、加拿大、墨西哥），**整個亞洲（包含台灣）都不在清單裡**。我實際打開 Duffel 的註冊頁面（app.duffel.com/join）確認過這點——不是「沒有台灣選項所以要選別的替代」這種小問題，是公司（或個人）不在那份清單裡的人，自助表單根本填不完。

## 二、為什麼選 Sky-scrapper（RapidAPI）

使用者要求「還有其他選擇嗎」後，研究了幾個方向：

- **Amadeus for Developers**：自助註冊入口已於 2026 年 7 月 17 日正式關閉（官網公告：「self-service portal has been decommissioned」），排除。
- **FlightAPI.io**：註冊只需 email/password，真實票價資料，但免費額度只有 20-30 次呼叫（非每月重置），對 fan-out 查詢方式來說太緊。
- **RapidAPI 上的 Sky-scrapper（Air Scraper）API**：跟這個專案已經在用的 AeroDataBox 同一個平台，RapidAPI 帳號只需要 email/password，沒有公司/國家欄位限制。抓的是 Skyscanner 的公開資料，是真實資料（不是像 Duffel 測試模式那樣的隨機假資料）。免費 BASIC 方案原先估計每月 100 次呼叫額度（後續用真實請求驗證，實際是 50 次，見下方「真實 API 驗證結果」一節）。

跟使用者確認後選擇 Sky-scrapper：是這三次資料源改版以來第一次同時滿足「免費」「個人開發者友善（無公司/國家門檻）」「真實資料」三個條件的方案。

## 三、免費額度的取捨

RapidAPI BASIC 方案每月呼叫額度有限（一開始估計 100 次，後來用真實請求驗證後校正為 50 次）。反向搜尋沿用「每個候選出發地平行查一次」的 fan-out 設計，Sky-scrapper 的 `searchFlights` 端點一樣只接受單一 origin/destination 配對。跟使用者確認後：

- **候選出發地清單從 28 個縮小為 10 個**（`skyscrapper/candidateOrigins.ts`），當時估計讓每月大約能完整搜尋 3-4 次（後續依真實額度數字再縮小為 6 個，見下方「真實 API 驗證結果」一節）。
- **機場代碼解析成 skyId/entityId 的結果永久快取在 Redis**（預設 30 天，`SKYSCRAPPER_ENTITY_CACHE_TTL_SECONDS`；見 `entityResolver.ts`）：`searchFlights` 需要 skyId 與 entityId，不能只給 IATA 代碼，必須先呼叫 `searchAirport` 解析。快取後只有每個機場「第一次」被查詢時要多付一次解析成本，之後單次搜尋大致等於「候選機場數」次呼叫。

## 四、架構異動

### 沿用 `FlightSearchClient` 介面，`server.ts` 只改一行 wiring

`ReverseSearchService` 依賴的 `FlightSearchClient` 介面在 Duffel 改版時就已經泛化過，這次直接受益：只需要寫一個新的 `SkyscrapperClient implements FlightSearchClient`，`server.ts` 把 `new DuffelClient(env)` 換成 `new SkyscrapperClient(env, redis.raw())` 即可，`ReverseSearchService` 本身完全沒動。

`SkyscrapperClient` 多了一個 `redis` 建構參數（Duffel/Travelpayouts 版本都不需要）——因為 entity 解析結果的快取需要直接讀寫 Redis，跟業務層的搜尋結果快取（`CacheStore`）是不同的 key 空間、不同的用途（一個是「機場代碼→ID」的永久對照表，一個是「查詢結果」的短期快取）。

### 新增 entity 解析層

這是跟 Duffel/Travelpayouts 版本最大的結構差異：Sky-scrapper 的 `searchFlights` 端點不接受 IATA 代碼，要先用 `searchAirport` 查出對應的 `skyId`/`entityId`。`entityResolver.ts` 封裝了「查快取 → 沒有就呼叫 API → 寫回快取」的邏輯，`client.ts` 對目的地只解析一次（所有候選出發地共用），對每個候選出發地各自解析一次。

### 候選出發地清單縮小為 10 個（後續再校正為 6 個）

見上方「免費額度的取捨」。`skyscrapper/candidateOrigins.ts` 獨立維護一份，不跟 Duffel/Travelpayouts 版本共用，維持三個資料源模組互不依賴的既有原則。

### 型別欄位：資料完整度介於 Travelpayouts 與 Duffel 之間

- `arrivalAt` / `durationMinutes` / `stopovers`：Sky-scrapper 的 leg 層級資料有提供，正常填值。
- `bookingToken` / `deepLink`：都缺席——這是非官方的查詢 API，沒有消費者訂票頁可以連結，也沒有自己的訂單 id 可以當 booking token。
- `segments`（航段明細，AeroDataBox 校驗用）：**這是本次改版最大的殘留風險**，見下方「殘留風險」。

## 五、殘留風險

- ~~segment 層級的航班班號欄位未經官方文件驗證~~ **已於 2026-09-22 驗證，見下方「真實 API 驗證結果」一節**：`skyscrapper/mapper.ts` 仍保留找不到可信班號時回傳空陣列的防禦性寫法，但原因已從「欄位名稱未知」改為「這個 API 沒有 SLA 保證，個別航線仍可能缺欄位」。
- **免費額度每月實際只有 50 次**（見下方「真實 API 驗證結果」一節，非原先估計的 100 次）：候選出發地清單已進一步縮小到 6 個，換來每月大約 7-8 次完整搜尋的空間。若使用者想要更完整的候選地覆蓋率或更高的查詢頻率，需要升級付費方案（PRO $9.99/月）。
- **非官方 API，沒有 SLA 保證**：跟 Duffel（官方測試模式）、Travelpayouts（官方正式 API）不同，Sky-scrapper 是社群維護的第三方封裝，穩定性、資料更新頻率都沒有官方保證。
- **429 的 retry-after 格式、`searchAirport` 對所有候選機場是否都能正確解析出機場層級 skyId 仍未逐一驗證**：2026-09-22 只驗證過一次成功的 `searchFlights` 呼叫（NRT → TPE），尚未實際觸發過 429，且不是每個候選機場都已個別測試過 `searchAirport` 解析結果。
- **日期範圍簡化為單一日期**：沿用 Duffel 版本的簡化，只用 `dateFrom`／`returnDateFrom` 查詢，忽略 `dateTo`／`returnDateTo`——這次雖然是真實資料，但免費額度太緊，沒有本錢為了更精確的日期覆蓋率去多打額外請求。
- **`duffel/` 與 `travelpayouts/` 模組都保留但未使用**：代表倉庫裡同時存在三套查票 client 實作，都符合同一個 `FlightSearchClient` 介面，日後想切換回任一個都只要改 `server.ts` 一行。

## 五之一、真實 API 驗證結果（2026-09-22）

使用者申請到自己的 RapidAPI 金鑰後，在 RapidAPI 的 Test Endpoint 介面上手動打了一次真實的
`searchFlights`（NRT → TPE），並把完整回應 JSON 貼回來核對。結果：

- **segment 層級欄位假設全部驗證為正確**：`segments[].flightNumber` 是字串（例如 `"875"`），
  `segments[].marketingCarrier.alternateId` 就是航空公司 IATA 代碼（例如 `"TR"`）。原本在
  `mapper.ts`／`types.ts` 標註「推測、未驗證」的部分已更新為「已驗證」，防禦性的空陣列
  fallback 保留，但理由改成「這個 API 沒有 SLA 保證」而非「欄位名稱未知」。
- **免費額度修正為每月 50 次**：回應的 `x-ratelimit-requests-limit` header 顯示 50，不是先前
  從第三方部落格文章估計的 100。已據此把候選出發地清單從 10 個進一步縮小為 **6 個**
  （見 `skyscrapper/candidateOrigins.ts`），讓每月大約能完整搜尋 7-8 次，而不是原本估計的 3-4 次。
- **新發現、目前未處理**：回應最外層有 `data.context.status`，這次收到的是 `"incomplete"`，
  搭配一個 `context.sessionId`——這是 Skyscanner 系列 API 常見的非同步查詢機制，代表第一次呼叫
  可能還在背景蒐集更多報價，理論上可以拿 `sessionId` 再打一次同一個端點取得更完整的結果。
  目前 `client.ts` 只打一次就直接使用回傳的 itineraries，沒有做輪詢；這次驗證看到
  `status: "incomplete"` 時仍然回傳了 10 筆可用的 itinerary，代表單次呼叫至少堪用，但可能不是
  最終最完整的結果。是否要加上輪詢邏輯，留待之後視實際使用情況決定（輪詢會消耗額外的免費額度）。

## 六、自動化測試

```bash
cd backend && npx tsc --noEmit   # typecheck
cd backend && npm test           # vitest run
```

typecheck：全過，無錯誤。

測試結果：
```
 Test Files  22 passed (22)
      Tests  134 passed (134)
```

新增測試檔案：
- `test/skyscrapperCandidateOrigins.test.ts`（6 項）：預設清單無重複、格式正確、縮小為 6 個機場、覆寫解析
- `test/skyscrapperMapper.test.ts`（6 項）：itinerary → FlightOffer 轉換、缺 price/legs 時回傳 null、carriers 缺席時 airlines 退化為佔位文字、segments 缺可信班號時回傳空陣列、segments 完整時正確轉換、候選出發地彙整/排序/截斷
- `test/skyscrapperEntityResolver.test.ts`（4 項）：機場層級候選項目解析與快取、快取命中不重複呼叫 API、找不到候選項目時拋錯、429 時讀取 retry-after
- `test/skyscrapperClient.test.ts`（6 項）：未設定金鑰直接失敗、多出發地平行查詢彙整（驗證目的地+候選出發地各自的 entity 解析次數）、單一出發地失敗不影響其他、全部失敗時拋聚合錯誤、候選出發地等於目的地時跳過、entity 解析結果快取後第二次搜尋不重複呼叫 searchAirport

修改既有測試：`test/reverseSearchRoute.test.ts`（改用 `SkyscrapperRateLimitError`／`SkyscrapperTimeoutError`）、`test/travelpayoutsClient.test.ts` 與 `test/duffelClient.test.ts`（`makeEnv` 補上新增的 `SKYSCRAPPER_*` 環境變數欄位以符合型別）。
