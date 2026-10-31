# 測試報告 — 資料來源改版：Travelpayouts → Duffel（測試模式）

日期：2026-09-22
範圍：`duffel/`（新模組，取代 server.ts 裡的 Travelpayouts wiring）、`search/reverseSearchService.ts`（介面泛化）、`routes/reverseSearch.ts`、`server.ts`、`config/env.ts`、`types/flight.ts`、前端 `types/reverseSearch.ts`、`components/ResultList.vue`

## 一、觸發原因

使用者實際走過 Travelpayouts 的申請流程後發現：帳號會被導向一個強制性的「Drive」外掛安裝流程，必須先讓這段第三方 script 在自己真實擁有的網站上通過即時驗證，才能解鎖 Profile 頁面拿到 API token——不是原本以為的「同意條款即可」。

我實際把 Travelpayouts Drive 的 loader script（`https://emrldtp.com/NTc2Nzc4.js`）原始碼抓下來讀過，確認：
- 沒有 `document.domain` 或跨子網域 cookie 的寫法，範圍確實限於實際載入該 script 的頁面。
- 但會在執行時動態載入第二階段程式碼（同網域另一支 chunk），內容無法事先稽核。
- 會對整個頁面 HTML 做快照（`getHtmlSnapshot`），推測會被第二階段程式碼上傳處理。
- 用 `Function.prototype.toString` 反偵測手法隱藏自己對 `Element.prototype.setAttribute` / `cloneNode` / `replaceChild` 的 monkey-patch，這是積極型廣告/導購外掛常見手法，不是單純的分析追蹤碼等級。

使用者評估後認為這超出可接受範圍，決定改用資料真實性換取隱私/安全考量更單純的方案。

## 二、為什麼選 Duffel（測試模式）

Duffel 的測試/沙盒帳號是純自助註冊，不需要在任何網站上安裝任何東西、不需要通過任何第三方驗證，帳號建立後即可用測試 token 呼叫 `/air/offer_requests`。取捨很清楚：

| | Travelpayouts | Duffel（測試模式） |
|---|---|---|
| 取得方式 | 自助註冊，但須完成 Drive 安裝驗證 | 純自助註冊，無額外條件 |
| 資料真實性 | 真實市場資料（定期更新的快取） | 假資料（固定航空公司 Duffel Airways／代碼 ZZ，時刻表與價格隨機產生） |
| 資料完整度 | 缺抵達時間/飛行時長/轉機次數/booking token | 完整（甚至比 Travelpayouts 版本更完整） |
| 消費者訂票連結 | 有（Aviasales 深連結） | 無（Duffel 是純開發者 API，沒有公開訂票頁） |

這是刻意的權衡：先用完全不需要額外安裝/驗證的假資料把整條系統流程（快取分級、AeroDataBox 校驗、前端渲染）跑起來驗證正確性，之後若使用者想要真實資料，`travelpayouts/` 模組完整保留，隨時可以切回去（見下方「保留 Travelpayouts 模組」）。

## 三、架構異動

### `ReverseSearchService` 依賴介面泛化

新增 `FlightSearchClient` 介面（`{ searchReverseFlights(query): Promise<FlightOffer[]> }`），`ReverseSearchService` 建構子改依賴這個介面而不是具體的 `TravelpayoutsClient` 型別。這是這個專案第二次換資料源後才做的重構——事後發現「provider 原始回應格式外洩到 service 層」是每次換資料源都要改的地方，泛化成介面後，未來再換一次資料源就完全不用碰 `reverseSearchService.ts`。

### 候選出發地策略不變

Duffel 的 `offer_requests` 一樣只接受單一 origin/destination 配對（用 `slices` 陣列表達行程），沒有多地點語法，沿用跟 Travelpayouts 版本相同的「每個候選機場平行查一次、內部彙整」策略，候選機場清單也是同一份（`duffel/candidateOrigins.ts`，內容與 `travelpayouts/candidateOrigins.ts` 相同但獨立維護，避免兩個模組互相牽動）。

### 日期範圍簡化為單一日期

Duffel 的 slice 只接受單一 `departure_date`，不像 Travelpayouts 有「整月」概念。因為這本來就是測試假資料、不是真實報價，直接固定用查詢區間的第一天（`dateFrom`／`returnDateFrom`）當查詢日期，不逐日或逐月列舉——真實資料源才需要對日期範圍做更精確的處理，這點已寫入 `duffel/client.ts` 檔頭註解。

### 型別異動：`deepLink` 改為 optional

Duffel 沒有消費者訂票頁可以連結（跟 Kiwi／Travelpayouts 不同，兩者背後都是真正的訂票網站），`FlightOffer.deepLink` 改為 optional。前端 `ResultList.vue` 對應調整：有 `deepLink` 才顯示「前往訂票」連結，沒有則顯示「此資料源暫無訂票連結」的提示文字，而不是連到一個空字串。

反過來，Duffel 測試模式的資料完整度其實比 Travelpayouts 好——`arrivalAt` / `durationMinutes` / `stopovers` / `bookingToken` 這幾個先前因為 Travelpayouts 而變成 optional 的欄位，現在都能正常填值（用 Duffel 自己的 offer id 當 `bookingToken`，用第一段出發到最後一段抵達的時間差算 `durationMinutes`）。

### 保留 Travelpayouts 模組

`travelpayouts/` 整個目錄沒有被刪除或修改，只是 `server.ts` 不再 wiring 它。若使用者之後想要真實市場資料（例如願意接受 Drive 安裝、或申請到不需要這個流程的帳號類型），只要把 `server.ts` 裡的 `new DuffelClient(env)` 換回 `new TravelpayoutsClient(env)` 即可，兩者都符合 `FlightSearchClient` 介面。

## 四、自動化測試

```bash
cd backend && npx tsc --noEmit   # typecheck
cd backend && npm test           # vitest run
```

typecheck：全過，無錯誤。

測試結果：
```
 Test Files  18 passed (18)
      Tests  112 passed (112)
```

新增測試檔案：
- `test/duffelCandidateOrigins.test.ts`（4 項）：預設清單無重複、格式正確、覆寫解析
- `test/duffelMapper.test.ts`（4 項）：原始 offer → FlightOffer 轉換（含多航段時長/轉機次數計算、`priceExpiresAt`）、候選出發地彙整/排序/截斷
- `test/duffelClient.test.ts`（6 項）：未設定 token 直接失敗、多出發地平行查詢彙整（含驗證 header 正確帶上 `duffel-version: v2` 與 Bearer token）、round-trip 查詢正確組出兩個 slice、單一出發地失敗不影響其他、全部失敗時拋聚合錯誤、候選出發地等於目的地時跳過

修改既有測試：`test/reverseSearchService.test.ts`（改用泛化的 `FlightSearchClient` 型別）、`test/reverseSearchRoute.test.ts`（改用 `DuffelRateLimitError`／`DuffelTimeoutError`）、`test/travelpayoutsClient.test.ts`（`makeEnv` 補上新增的 `DUFFEL_*` 環境變數欄位以符合型別）。

## 五、殘留風險

- **這是假資料，不是真實票價**——這是本次改版刻意的取捨，不是未預期的限制。使用者測試介面、驗證系統邏輯時，看到的所有出發地、價格、班次都是 Duffel Airways 隨機產生的測試資料，不能拿來做任何真實訂票決策。
- **日期範圍簡化為單一日期**：目前只用 `dateFrom`（及 round-trip 的 `returnDateFrom`）查詢，忽略 `dateTo`／`returnDateTo`，因為 Duffel 的 slice 本來就只接受單一日期，而且反正是假資料，沒有必要為了假資料做逐日查詢。真實資料源才需要處理這件事。
- **尚未用真實 Duffel 測試 token 實際打過 API**：header 格式、round-trip 的兩個 slice 組合方式、429 的 `ratelimit-reset` 日期格式解析，都只驗證過程式邏輯本身（mock fetch），沒有對真實 Duffel sandbox 環境跑過一次。使用者拿到 token 後應優先驗證這幾點。
- **`travelpayouts/` 模組保留但未使用**：這是刻意保留供未來切換，但代表倉庫裡同時存在兩套查票 client 實作，日後維護時要留意兩邊型別/介面是否還相容（目前都符合同一個 `FlightSearchClient` 介面，理論上不會分岔）。
