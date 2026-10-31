# 測試報告 — 目的地反向搜票核心邏輯

日期：2026-09-22
範圍：`POST /api/reverse-search`、4 層快取鮮度判斷、Kiwi Tequila API client、資料映射

## 一、自動化單元測試（Vitest）

執行指令：
```bash
cd backend
npm test
```

結果：
```
 ✓ test/reverseSearchService.test.ts (10 tests)
 ✓ test/tequilaClient.test.ts (9 tests)
 ✓ test/reverseSearchRoute.test.ts (5 tests)
 ✓ test/mapper.test.ts (7 tests)
 ✓ test/reverseSearchSchema.test.ts (8 tests)
 ✓ test/redisClient.test.ts (4 tests)
 ✓ test/healthRoute.test.ts (3 tests)
 ✓ test/freshness.test.ts (10 tests)
 ✓ test/env.test.ts (5 tests)
 ✓ test/dateFormat.test.ts (3 tests)

 Test Files  10 passed (10)
      Tests  64 passed (64)
```

### 本次新增測試涵蓋的重點案例

| 模組 | 涵蓋案例 |
|---|---|
| `classifyFreshness` | 4h / 24h / 48h 三個邊界值（剛好等於、超過 1ms）、負數年齡防禦 |
| `isoDateToKiwiFormat` | 正常轉換、需補零、格式錯誤拋錯 |
| `mapKiwiFlightToOffer` / `buildCandidateOrigins` | 欄位轉換、依 route 長度算轉機數、同出發地去重取最低價、依價格排序、maxResults 截斷 |
| `reverseSearchRequestSchema` | 合法 one-way/round-trip、目的地格式錯誤、過去日期、dateTo 早於 dateFrom、round-trip 缺回程日期、回程早於去程、maxResults 超出範圍 |
| `KiwiTequilaClient` | 缺 API key 提前失敗（不發請求）、請求參數正確組裝（fly_from=anywhere、日期格式、flight_type）、round-trip 參數、429/4xx/5xx/網路錯誤/逾時分別對應到正確的錯誤類別 |
| `ReverseSearchService` | cache miss、fresh、stale-notice、must-validate（成功／失敗降級）、discard（成功／失敗降級）、Redis 讀寫失敗容錯、完全無快取且 Live API 失敗時錯誤往上拋 |
| 路由 | 400 驗證錯誤、200 正常回應、429/504/500 錯誤對應 HTTP 狀態碼與 Retry-After header |

## 二、手動整合驗證（對實際跑起來的伺服器 + 真實 Redis）

以下全部是對啟動中的 Fastify 伺服器與本機 Redis 實際發送請求驗證，不是單元測試 mock：

### 2.1 輸入驗證
```bash
curl -X POST /api/reverse-search -d '{"destination":"TAIPEI","dateFrom":"bad"}'
```
→ `400`，回傳逐欄位錯誤訊息（destination 格式、dateFrom 格式、dateTo 缺漏）。✓

### 2.2 無快取、未設定 KIWI_API_KEY
→ `502 upstream_error`，訊息清楚指出「尚未設定 KIWI_API_KEY」。驗證了路由 → service → client 的錯誤傳遞鏈正確運作。✓

### 2.3 四層快取鮮度判斷（用真實 Redis 寫入不同時間戳的快取資料驗證）

| 情境 | 寫入的快取年齡 | 實際回應 |
|---|---|---|
| fresh | 1 小時前 | `source: cache-fresh`, `tier: fresh`，未呼叫 Kiwi ✓ |
| stale-notice | 10 小時前 | `source: cache-with-notice`, `tier: stale-notice`，附「10 小時前查詢」提示 ✓ |
| must-validate（校驗失敗） | 30 小時前 | 因未設定 API key 導致校驗失敗，正確降級為 `source: cache-with-notice`, `liveValidationFailed: true`，仍回傳舊資料而非整個失敗 ✓ |

## 三、已知限制

- **無法用真實 Kiwi API key 驗證 `fly_from=anywhere` 是否真的回傳多個出發地。** 這是本模組唯一無法在此環境驗證的外部行為假設，已在 `kiwi/tequilaClient.ts` 頂部註解中明確記錄。強烈建議：拿到正式 API key 後，第一件事就是對一個已知目的地實際打一次 `/api/reverse-search`，確認 `results` 陣列裡確實出現多個不同的 `origin`，而不是被誤解成單一地點代碼。
- 尚未實作：候選出發地的「當 anywhere 不受支援」備援策略（依國家/區域碼平行查詢後合併）。架構上已預留擴充點（`KiwiTequilaClient.searchReverseFlights` 的公開介面不需改變），但具體實作留到確認 anywhere 假設是否成立之後再做，避免在不確定假設是否需要的情況下過度設計。
- `>48h` 且 Live API 也失敗時，目前選擇「降級回傳過期資料並明確標記」而非直接回錯誤，這是為了使用者體驗（有資料總比空白頁好）；如果產品需求希望這種情況直接視為查無資料，這裡是唯一需要調整的分支（`reverseSearchService.ts` 的 `discard` case）。
