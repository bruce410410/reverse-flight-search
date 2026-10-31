# 測試報告 — AeroDataBox 即時校驗整合

日期：2026-09-22
範圍：`AeroDataBoxClient`、狀態分類邏輯（`classifyFlightStatus`）、`FlightValidationService`、與 `ReverseSearchService` 的整合

## 一、自動化單元測試（Vitest）

```bash
cd backend && npm test
```

新增測試檔案與案例數：
- `test/adbClient.test.ts`（9 項）：未設定 API key 提前失敗、URL/headers 組裝、404→空陣列（非錯誤）、200 成功、429/4xx/5xx/網路錯誤/逾時分別對應正確錯誤類別
- `test/adbValidator.test.ts`（13 項）：查無資料、Cancelled/CancelledUncertain、Diverted、Unknown/Unstated、時間吻合、drift 超過/未超過 60 分鐘門檻、優先採用 actualTime、缺少時間資訊、多筆結果取最接近者、checkedAt 正確性
- `test/flightValidationService.test.ts`（7 項）：topN=0 不呼叫、未設定 API key 不呼叫、只驗證前 N 筆其餘維持 not-checked、無航段資料不呼叫並標記 unknown、API 錯誤與逾時都不拋出例外、並行驗證多筆時彼此互不影響
- `test/reverseSearchService.test.ts` 新增 2 項：驗證 flightValidator 確實被呼叫且校驗後結果會被快取、未提供 flightValidator 時使用預設 no-op 不影響原有行為
- `test/mapper.test.ts` 補充：驗證 `FlightOffer.segments` 與預設 `flightStatus: "not-checked"`

全部測試結果：
```
 Test Files  13 passed (13)
      Tests  95 passed (95)
```

## 二、手動整合驗證

因本環境沒有 AeroDataBox 正式訂閱金鑰，手動驗證聚焦在「未設定金鑰時，整條路徑仍正常運作、不會因為新模組而讓既有功能退化」：

- 啟動伺服器（含新的 AeroDataBox 環境變數與 `createFlightValidationService` 組裝邏輯），確認 `GET /api/health` 與 `POST /api/reverse-search` 的既有行為（200/400/502 分支）完全不受影響。
- `FlightValidationService.validateTopOffers` 在 `AERODATABOX_API_KEY` 為空時直接短路回傳原陣列，經由上述 request 驗證伺服器啟動與既有路由未被新程式碼影響（真正的「有金鑰時實際打 API 拿到 confirmed/cancelled 結果」則由單元測試以 mock fetch 涵蓋，因為沒有真實金鑰無法在此環境對外驗證）。

## 三、已知限制

- **同樣有「假設未經真實 API 驗證」的風險**，性質與 Kiwi 的 `fly_from=anywhere` 假設一樣：`GET /flights/number/{number}/{date}` 的欄位命名（`status` 列舉值、`departure.scheduledTime.utc` 路徑等）是依公開文件整理，沒有用真實訂閱金鑰跑過一次真實回應比對。拿到金鑰後應優先用一個已知航班驗證這裡的型別與分類邏輯是否吻合實際回應。
- 目前只驗證行程的第一個航段；轉機行程的後續航段狀態尚未校驗（架構上可延伸，`FlightValidationService.validateOne` 是唯一需要調整的地方）。
- Top-N 校驗與快取綁定在一起：校驗結果會隨著整批候選出發地一起被快取，這代表在 `<=24h stale-notice` 情境下使用者看到的 `flightStatus` 可能是校驗當時的舊結果，而不是當下最新狀態。這是刻意的取捨（避免每次請求都打 AeroDataBox），如果之後覺得校驗結果需要比票價本身更新得更頻繁，需要拆成獨立的快取鍵與 TTL。
