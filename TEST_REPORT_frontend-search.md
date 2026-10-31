# 測試報告 — 前端搜尋頁面串接

日期：2026-09-22
範圍：`pages/index.vue`（搜尋頁）、`composables/useReverseSearch.ts`、`components/SearchForm.vue`、`components/ResultList.vue`、`components/CacheNotice.vue`、`components/FlightStatusBadge.vue`

## 一、建置驗證

```bash
cd frontend && npx nuxt build
```
結果：`✨ Build complete!`（client + server + nitro 皆成功，無型別或範本錯誤）

## 二、端對端瀏覽器測試（Playwright + 真實後端 + 真實 Redis）

因為這是前端互動邏輯（表單填寫、送出、非同步渲染結果），單純用 curl 無法驗證 JS 互動是否真的運作，所以用 headless Chromium 實際操作頁面：

### 2.1 成功搜尋，正確渲染候選出發地
- 啟動真實後端（連真實 Redis），手動寫入一筆 `TPE` 目的地、日期與前端表單預設值吻合的快取資料（兩個候選出發地：Tokyo/NRT 與 Hong Kong/HKG，各自不同的 `flightStatus`）
- 用 Playwright 開啟首頁、填入 `destination=TPE`、點擊送出按鈕、等待 `.offer-card` 出現
- 驗證結果：兩個出發地都正確顯示、快取鮮度提示正確顯示「資料為近期快取，準確度高」、`flightStatus` 徽章正確區分「即時確認」（綠色）與「未即時校驗」（灰色）
- 螢幕截圖確認版面、價格、時間、直飛/轉機資訊、訂票連結皆正確渲染 ✓

### 2.2 輸入驗證錯誤正確顯示
- 移除前端 `maxlength` 限制後，故意送出不合法的 `destination=TAIPEI`
- 後端回傳 `400` + 逐欄位錯誤（"destination 必須是 3 碼 IATA 機場代碼"）
- 前端正確在對應欄位下方顯示這則錯誤訊息 ✓

### 2.3 既有頁面未受影響
- `/status`（原健康檢查頁，從 `/` 搬移過去）依然正常運作，SSR 正確顯示「服務狀態：正常」✓

## 三、涵蓋的互動細節

- 表單預設值：`dateFrom` 自動抓「14 天後」、`dateTo` 為「`dateFrom` + 5 天」，避免使用者每次都要手動選過去或太近的日期
- `tripType` 切換為「來回」時，才顯示並要求回程日期欄位
- 日期輸入框的 `min` 屬性會隨著前一個日期欄位動態調整（例如回程起始日不能早於去程迄日），減少送出後才被後端拒絕的情況
- `FlightStatusBadge` 五種狀態（confirmed/schedule-changed/cancelled/unknown/not-checked）各自有獨立顏色與中文標籤
- `CacheNotice` 依 `cache.source` 顯示不同語氣（正常/提醒），並在 `liveValidationFailed` 為真時額外提示「即時更新失敗，暫時顯示舊資料」

## 四、已知限制

- 前端目前不重複後端完整的驗證規則（例如 round-trip 日期邏輯），只做基本的必填與格式檢查，交由後端回傳的逐欄位錯誤訊息呈現——這是刻意的設計取捨，細節見 `useReverseSearch.ts` 註解。
- 前後端型別定義目前各自維護一份（`frontend/types/reverseSearch.ts` 對應 `backend/src/types/flight.ts`），沒有共用套件，需手動保持同步。
- 尚未實作：搜尋結果排序/篩選（目前完全依後端回傳順序呈現）、分頁、多語系。
