# 全球反向低價搜尋系統

以「目的地導向、不設出發地」為核心創新的反向機票搜尋系統。

已完成模組：
1. **基礎專案架構**：monorepo 骨架、後端 Redis 連線層、前端最小可用頁面
2. **目的地反向搜票核心邏輯**：4 層快取鮮度判斷、`POST /api/reverse-search`
3. **AeroDataBox 即時校驗整合**：對前 N 筆候選出發地做即時航班狀態校驗（confirmed/schedule-changed/cancelled/unknown）
4. **前端搜尋頁面**：表單送出、結果列表、快取鮮度提示、即時航班狀態徽章
5. **候選出發地策略修正**：研究後發現 `fly_from=anywhere` 證據不足，改為更有根據的「多國家候選清單」方案（歷史記錄）
6. **資料來源改版（一）**：Kiwi Tequila API 已改為僅限受邀合作夥伴，一般開發者無法再自助申請金鑰，改用 Travelpayouts（Aviasales）Data API（歷史記錄，見 `TEST_REPORT_travelpayouts-migration.md`）
7. **資料來源改版（二）**：Travelpayouts 需要先讓其「Drive」外掛在自己網站上通過驗證才能拿到 API token，使用者評估後認為超出可接受範圍，改用 Duffel（測試模式）（歷史記錄，見 `TEST_REPORT_duffel-migration.md`）
8. **資料來源改版（三）**：Duffel 正式帳號註冊要求 Company name／Country of incorporation，國家清單沒有涵蓋台灣，**目前改用 Sky-scrapper（RapidAPI，真實 Skyscanner 資料）**——跟 AeroDataBox 同一平台，無公司/國家門檻，代價是免費額度每月僅 50 次（2026-09-22 用真實請求驗證過，見下方「資料來源」與 `TEST_REPORT_skyscrapper-migration.md`）

## 技術棧

| 層 | 技術 |
|---|---|
| 後端 | Node.js 22 + TypeScript + Fastify |
| 快取 | Redis 7（Docker 佈署，本機開發用 docker-compose） |
| 前端 | Nuxt 3 + Vue 3 + TypeScript |
| 資料庫 | 暫不使用（先以 Redis 為唯一資料層） |
| 外部 API | Sky-scrapper（RapidAPI，航班搜尋；Duffel／Travelpayouts 實作保留備用）、AeroDataBox（即時航班狀態，也是 RapidAPI） |
| 測試 | Vitest（後端）、Playwright（前端端對端） |

## 專案結構

```
reverse-flight-search/
├── backend/
│   ├── src/
│   │   ├── config/env.ts              # 環境變數驗證（zod）
│   │   ├── redis/client.ts            # Redis 連線封裝（重試策略、健康檢查）
│   │   ├── cache/freshness.ts         # 4 層快取鮮度判斷（<=4h/<=24h/<=48h/>48h）
│   │   ├── cache/cacheStore.ts        # 通用 Redis JSON 快取存取 + cache key 產生
│   │   ├── skyscrapper/client.ts      # Sky-scrapper client（目前使用中）：對每個候選出發地平行查詢並彙整
│   │   ├── skyscrapper/entityResolver.ts # IATA 代碼 → skyId/entityId 解析，結果快取在 Redis（見「資料來源」）
│   │   ├── skyscrapper/candidateOrigins.ts # 候選出發地（機場清單，僅 6 個，免費額度考量）
│   │   ├── skyscrapper/mapper.ts      # 原始 itinerary → 正規化 FlightOffer，去重＋排序
│   │   ├── skyscrapper/errors.ts      # API 錯誤分類（逾時／頻率限制／網路／HTTP／機場解析失敗／全部候選出發地失敗）
│   │   ├── duffel/                    # 備用資料源實作，目前未 wiring（見「資料來源」一節）
│   │   ├── travelpayouts/             # 備用資料源實作，目前未 wiring（見「資料來源」一節）
│   │   ├── adb/client.ts              # AeroDataBox API client（即時航班狀態）
│   │   ├── adb/validator.ts           # 原始狀態 → confirmed/schedule-changed/cancelled/unknown
│   │   ├── adb/flightValidationService.ts  # Top-N 校驗、容錯（絕不拋出例外）
│   │   ├── search/reverseSearchService.ts  # 核心：整合快取決策 + 查票（FlightSearchClient 介面）+ AeroDataBox 校驗
│   │   ├── routes/health.ts           # GET /api/health
│   │   ├── routes/reverseSearch.ts    # POST /api/reverse-search
│   │   ├── routes/reverseSearchSchema.ts   # 請求驗證（zod）
│   │   ├── types/flight.ts            # 網域型別（FlightOffer、CacheMeta 等）
│   │   ├── server.ts                  # Fastify app 組裝
│   │   └── index.ts                   # 進入點
│   └── test/                          # Vitest 單元測試（134 項）
├── frontend/
│   ├── pages/index.vue                # 搜尋頁（主頁）
│   ├── pages/status.vue               # 系統健康狀態頁
│   ├── composables/useReverseSearch.ts
│   ├── composables/useBackendHealth.ts
│   ├── components/SearchForm.vue
│   ├── components/ResultList.vue
│   ├── components/CacheNotice.vue
│   ├── components/FlightStatusBadge.vue
│   └── types/reverseSearch.ts         # 對應後端 API 契約的前端型別
└── docker-compose.yml                 # Redis 容器
```

## 快速開始

### 1. 啟動 Redis

```bash
docker compose up -d redis
```

> 本開發環境沒有 Docker daemon 可用，因此改用本機安裝的 `redis-server` 完成所有驗證；`docker-compose.yml` 本身未變更，在你自己的機器上應可直接用 `docker compose up -d redis` 啟動。

### 2. 啟動後端

```bash
cd backend
cp .env.example .env
# 編輯 .env，填入 SKYSCRAPPER_API_KEY（申請：https://rapidapi.com/ 免費註冊或用既有帳號
# → 搜尋 "Sky Scrapper" → Subscribe to Test → 選 BASIC（$0）方案 → 複製 X-RapidAPI-Key）
# 選填 AERODATABOX_API_KEY（申請：https://rapidapi.com/aedbx-aedbx/api/aerodatabox，跟上面同一個平台）
npm install
npm run dev        # http://localhost:3001
```

### 3. 啟動前端

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # http://localhost:3000
```

首頁 `/` 是工具箱入口；機票搜尋頁在 `/flights`，系統健康狀態頁在 `/status`。

## 聰明旅人工具箱（複合式旅遊網站，MVP）

網站已從單一機票搜尋擴充為多模組工具箱：

| 頁面 | 功能 |
|---|---|
| `/flights` | 機票盲搜（既有功能，走後端 API） |
| `/route-storyboard` | 路痴救星：前端以使用者自備 Key 直連 Google Routes API 取得單一路線，再用 Maps JavaScript API 顯示互動街景；街景會疊加下一個路口或目的地的標記與引導線，並隨視角移動（相機在路口前 20 公尺看向路口；直行段不出圖卡） |
| `/settings` | 使用者貼上自己的 Google Maps API Key（只存在瀏覽器 localStorage，不送到後端），附申請教學 |

路痴救星需要 Key 啟用 **Routes API**、**Maps Static API** 與 **Maps JavaScript API**。核心邏輯在 `frontend/utils/storyboard.ts`。

尚未實作（規劃書後續階段）：房間彈性配對與評論雷區審查、免費/付費分級、PDF 匯出、會員與雲端同步。

## API：POST /api/reverse-search

### 請求格式

```json
{
  "destination": "TPE",
  "dateFrom": "2026-11-01",
  "dateTo": "2026-11-10",
  "tripType": "one-way",
  "returnDateFrom": "2026-11-15",
  "returnDateTo": "2026-11-20",
  "currency": "TWD",
  "maxResults": 20
}
```

| 欄位 | 必填 | 說明 |
|---|---|---|
| `destination` | 是 | 3 碼 IATA 機場代碼 |
| `dateFrom` / `dateTo` | 是 | 去程日期範圍，ISO `YYYY-MM-DD`，不能是過去 |
| `tripType` | 否，預設 `one-way` | `one-way` 或 `round-trip` |
| `returnDateFrom` / `returnDateTo` | `round-trip` 時必填 | 回程日期範圍，不能早於去程 `dateTo` |
| `currency` | 否，預設 `TWD` | ISO 4217 貨幣代碼 |
| `maxResults` | 否，預設 20，上限 100 | 最多回傳幾個候選出發地 |

### 回應格式（200）

```json
{
  "destination": "TPE",
  "queriedAt": "2026-09-22T08:47:10.416Z",
  "cache": {
    "source": "cache-fresh",
    "tier": "fresh",
    "cachedAt": "2026-09-22T07:47:10.400Z",
    "ageMs": 3600015,
    "notice": "此資料為 10 小時前查詢的結果，實際票價可能已有變動",
    "liveValidationFailed": false
  },
  "results": [
    {
      "origin": "NRT",
      "originCity": "Tokyo",
      "originCountry": "Japan",
      "price": 4200,
      "currency": "TWD",
      "airlines": ["CI"],
      "departureAt": "2026-11-05T09:00:00.000Z",
      "arrivalAt": "2026-11-05T12:00:00.000Z",
      "durationMinutes": 180,
      "stopovers": 0,
      "priceExpiresAt": null,
      "segments": [],
      "flightStatus": {
        "status": "unknown"
      }
    }
  ]
}
```

上面範例是目前使用中的 Sky-scrapper 回應形狀：`arrivalAt`／`durationMinutes`／`stopovers` 通常會填值，但沒有 `bookingToken`／`deepLink`（非官方查詢 API，沒有訂單 id 也沒有消費者訂票頁可以連結）。`segments` 通常會有值（2026-09-22 用真實回應驗證過 `flightNumber`／`marketingCarrier.alternateId` 欄位假設正確），但因為這個 API 沒有 SLA 保證、沒有官方 schema，個別航線仍可能缺欄位；缺少可信資料時 `mapper.ts` 刻意不編造假班號，讓該筆改回空陣列，這種情況下 `flightStatus` 會停在 `unknown`（AeroDataBox 因為沒有航段資料可用而跳過校驗），細節見 `TEST_REPORT_skyscrapper-migration.md`「殘留風險」與「真實 API 驗證結果」兩節。若之後切回 `duffel/` 或 `travelpayouts/` 模組，回應形狀會不同：Duffel 版本 `segments`／`bookingToken` 齊全但沒有 `deepLink`；Travelpayouts 版本有 `deepLink` 但沒有 `arrivalAt`／`durationMinutes`／`stopovers`／`bookingToken`。缺席的欄位前端不顯示對應區塊。

`flightStatus.status` 可能的值：`confirmed`（AeroDataBox 確認航班存在且時間吻合）、`schedule-changed`（存在但時間有明顯落差或已改降）、`cancelled`（已被航空公司取消）、`unknown`（查無資料或校驗服務暫時無法使用）、`not-checked`（本次未觸發校驗——只有依價格排序的前 `AERODATABOX_VALIDATE_TOP_N` 筆會被校驗，其餘維持這個值）。

`cache.source` 可能的值：
- `cache-fresh`：快取 <=4h，直接使用
- `cache-with-notice`：快取 <=24h（附 `notice`），或校驗/重查失敗後降級使用舊快取（`liveValidationFailed: true`）
- `cache-validated`：快取 <=48h，已重新打 Live API 校驗成功
- `live`：無快取，或快取 >48h 被捨棄，直接查 Live API

錯誤回應：`400`（輸入不合法，附逐欄位 `details`）、`429`（Sky-scrapper 頻率超限，附 `Retry-After`；免費方案每月僅 50 次額度很容易觸發）、`502`（Sky-scrapper 上游錯誤／網路錯誤／機場代碼解析失敗／所有候選出發地都查詢失敗）、`504`（Sky-scrapper 逾時）、`500`（未預期錯誤）。

## 設計要點

- **4 層快取鮮度判斷**：<=4h 直接用快取；<=24h 用快取但附提示；<=48h 強迫打 Live API 校驗，失敗才降級用舊快取並標記 `liveValidationFailed`；>48h 直接捨棄視同 cache miss，若重查也失敗則以標記過的舊資料兜底，避免使用者拿到空白頁。
- **候選出發地策略**：見下方「候選出發地策略」專節。
- **即時航班狀態校驗**：對價格排序後的前 `AERODATABOX_VALIDATE_TOP_N` 筆候選出發地，用 AeroDataBox 交叉確認航班是否仍照原訂計畫飛行，補足「票價快取仍在有效期內，但航班本身可能已取消/大幅改期」的風險缺口；校驗結果隨整批結果一起快取。
- **Redis 故障容錯**：讀取快取失敗直接退化為查 Live API；寫入快取失敗不影響本次查詢結果；服務永遠優先讓使用者拿到資料，而不是因為快取層問題整個失敗。
- **Redis 連線策略**：`ioredis` 指數退避重試（上限 10 秒 + 隨機抖動），超過 `REDIS_MAX_RETRIES` 停止重連，`/api/health` 誠實回報「degraded」。

## 資料來源與候選出發地策略

### 資料來源演進：Kiwi → Travelpayouts → Duffel → Sky-scrapper

最初選用 Kiwi Tequila API，設計上假設其 `fly_from` 參數接受字面值 `"anywhere"`。經研究（見 `TEST_REPORT_anywhere-verification.md`）發現找不到任何文件支持這個假設，改採「`fly_from` 送出一組國家層級地點 ID」的方案。但 2026 年 9 月進一步確認，**Kiwi Tequila 已把新合作夥伴改成僅限受邀審核，一般開發者無法再自助申請 API 金鑰**，因此連驗證上述假設的機會都沒有了。

第一次改版改用 **Travelpayouts（Aviasales）Data API**。實際走過申請流程後發現：帳號會被導向強制性的「Drive」外掛安裝流程，必須先讓一段第三方 script 在自己真實擁有的網站上通過即時驗證才能解鎖 API token。實際讀過該 script 原始碼後（會動態載入無法事先稽核的第二階段程式碼、對整頁做 HTML 快照、用反偵測手法隱藏自己的 DOM monkey-patch），評估後認為超出可接受範圍，決定放棄。細節見 `TEST_REPORT_travelpayouts-migration.md` 與 `TEST_REPORT_duffel-migration.md`。

第二次改版改用 **Duffel API（測試模式）**——純自助註冊、不需要在任何網站安裝或驗證任何東西。代價是資料是結構正確但內容隨機產生的測試假資料（固定航空公司 Duffel Airways／代碼 ZZ），不是真實市場報價，且沒有消費者訂票連結。細節見 `TEST_REPORT_duffel-migration.md`。

第三次改版改用 **Sky-scrapper（RapidAPI，真實 Skyscanner 資料）**。使用者接著申請 Duffel 正式帳號時發現：註冊表單強制要求「Company name」與「Country of incorporation」，且國家清單只列了約 30 個歐美/加拿大/墨西哥的司法管轄區，整個亞洲（包含台灣）都不在裡面——我實際打開 Duffel 的註冊頁面確認過這點。改用 Sky-scrapper 是因為它跟這個專案已經在用的 AeroDataBox 同一個平台（RapidAPI），註冊只需要 email/password，沒有公司/國家限制，而且是真實資料（不是像 Duffel 測試模式那樣的隨機假資料）。代價是免費方案每月只有 50 次呼叫額度（2026-09-22 用使用者實際申請到的金鑰打過一次真實請求，從 `x-ratelimit-requests-limit` header 驗證出正確數字，並非最初估計的 100 次），且是非官方、社群維護的 API，沒有官方 schema 文件與 SLA 保證。`duffel/` 與 `travelpayouts/` 模組都完整保留未刪除，未來想換回任一個，只要在 `server.ts` 把 wiring 換掉即可，三者都符合同一個 `FlightSearchClient` 介面。細節見 `TEST_REPORT_skyscrapper-migration.md`。

### 候選出發地策略（Sky-scrapper 版本，目前使用中）

Sky-scrapper 的 `searchFlights` 端點一樣只接受單一 origin/destination 配對，不支援多地點語法，且不接受 IATA 代碼——要先呼叫 `searchAirport` 解析出對應的 `skyId`/`entityId`（見 `backend/src/skyscrapper/entityResolver.ts`），解析結果會永久快取在 Redis（預設 30 天，`SKYSCRAPPER_ENTITY_CACHE_TTL_SECONDS`）以節省額度。因為免費方案每月實際只有 50 次呼叫（見上），候選出發地清單從先前版本的 28 個縮小為 **6 個**（橫跨各大洲主要航空市場，見 `backend/src/skyscrapper/candidateOrigins.ts`），讓每月大約能完整搜尋 7-8 次；可用 `SKYSCRAPPER_CANDIDATE_ORIGINS` 環境變數覆寫。日期範圍固定用查詢區間第一天（`dateFrom`／`returnDateFrom`），不逐日查詢——這次雖然是真實資料，但免費額度太緊，沒有本錢為了更精確的日期覆蓋率去多打額外請求。

## 測試

- 基礎架構：`TEST_REPORT.md`
- 反向搜票核心邏輯：`TEST_REPORT_reverse-search.md`
- AeroDataBox 即時校驗：`TEST_REPORT_aerodatabox.md`
- 前端搜尋頁面：`TEST_REPORT_frontend-search.md`
- fly_from=anywhere 假設驗證（歷史紀錄，Kiwi 已停用）：`TEST_REPORT_anywhere-verification.md`
- Kiwi → Travelpayouts 資料來源改版（歷史紀錄，Travelpayouts 已停用）：`TEST_REPORT_travelpayouts-migration.md`
- Travelpayouts → Duffel 資料來源改版（歷史紀錄，Duffel 已停用）：`TEST_REPORT_duffel-migration.md`
- Duffel → Sky-scrapper 資料來源改版（目前使用中）：`TEST_REPORT_skyscrapper-migration.md`

## 已知限制

- ~~segment 層級的航班班號欄位未經官方文件驗證~~ **已於 2026-09-22 用真實回應驗證正確**（`flightNumber` 是字串、`marketingCarrier.alternateId` 是航空公司 IATA 代碼）。`mapper.ts` 仍保留缺可信資料時讓 `segments` 回傳空陣列的防禦寫法，但原因已改為「這個 API 沒有 SLA 保證」而非「欄位未知」。另外發現回應裡有 `context.status: "incomplete"` 搭配 `sessionId`，疑似 Skyscanner 式的非同步輪詢機制，目前沒有處理，細節見 `TEST_REPORT_skyscrapper-migration.md`「真實 API 驗證結果」一節。
- **免費額度每月僅 50 次呼叫**（2026-09-22 已用真實請求驗證），候選出發地清單因此縮小為 6 個機場，每月大約只能完整搜尋 7-8 次；機場代碼解析結果雖已快取，但升級付費方案前這仍是硬限制。
- **429 的 retry-after 格式、market/countryCode 參數是否影響正確性、`searchAirport` 對所有候選機場是否都能正確解析出機場層級的 skyId 仍未逐一驗證**：2026-09-22 只驗證過一次成功的 `searchFlights` 呼叫（NRT → TPE），其餘情境仍只驗證過程式邏輯本身（mock fetch）。
- 日期範圍簡化為單一日期查詢（`dateFrom`／`returnDateFrom`），忽略 `dateTo`／`returnDateTo`——沿用 Duffel 版本的簡化，這次雖是真實資料，但免費額度太緊沒有本錢逐日查詢。
- Sky-scrapper 沒有消費者訂票頁可以連結，也沒有自己的訂單 id，`FlightOffer.bookingToken`／`deepLink` 都是 optional，前端在缺 `deepLink` 時顯示「此資料源暫無訂票連結」而非空連結。
- **AeroDataBox 的欄位假設尚未經真實金鑰驗證**，細節見 `TEST_REPORT_aerodatabox.md`。
- AeroDataBox 目前只驗證每個候選出發地行程的第一個航段。
- 機場候選清單為人工篩選、非窮舉，可能遺漏部分次要市場。
- 前後端型別各自維護一份，沒有共用套件。
- `duffel/` 與 `travelpayouts/` 模組都保留但未使用，代表倉庫裡同時存在三套查票 client 實作，日後維護需留意彼此是否還相容同一個 `FlightSearchClient` 介面。
- 尚未實作：搜尋結果排序/篩選/分頁、多語系。

## 下一步建議

1. 視實際使用頻率評估是否需要升級 RapidAPI 付費方案（PRO $9.99/月起），以放寬候選出發地清單與查詢次數限制。
2. 取得 AeroDataBox 正式金鑰，驗證即時校驗整合的所有假設。
3. 視情況評估是否要處理 `context.status: "incomplete"` 的輪詢語意（見「已知限制」）。
4. 前端體驗優化：結果排序/篩選、分頁、多語系。

請確認要優先進行哪一項，我會依此啟動下一輪「企劃 → 製作 → 測試」流程。
