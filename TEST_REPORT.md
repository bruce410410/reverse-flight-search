# 測試報告 — 基礎專案架構

日期：2026-09-22
範圍：backend Redis 連線層、健康檢查 API、前後端整合

## 一、自動化單元測試（Vitest）

執行指令：
```bash
cd backend
npm test
```

結果：

```
 ✓ test/redisClient.test.ts (4 tests) 11ms
 ✓ test/healthRoute.test.ts (3 tests) 28ms
 ✓ test/env.test.ts (5 tests) 7ms

 Test Files  3 passed (3)
      Tests  12 passed (12)
```

### 測試案例清單

| 檔案 | 案例 | 驗證內容 |
|---|---|---|
| env.test.ts | 預設值套用 | 未提供環境變數時，各項設定回退到合理預設值 |
| env.test.ts | 型別轉換 | 字串環境變數正確轉為 number / enum |
| env.test.ts | NODE_ENV 非法值 | 拋出包含「環境變數設定錯誤」的明確錯誤 |
| env.test.ts | PORT 非正整數 | 拋出明確錯誤，避免用負數 port 啟動 |
| env.test.ts | 快取行為 | 重複呼叫 loadEnv 回傳同一份快取結果 |
| redisClient.test.ts | ping() 失敗回報 | 連到不存在的 Redis 時，ok=false 且附錯誤訊息 |
| redisClient.test.ts | retryStrategy 上限 | 超過 REDIS_MAX_RETRIES 後回傳 null，停止重連 |
| redisClient.test.ts | 指數退避上限 | 重試延遲不超過 10 秒 + 200ms 抖動 |
| redisClient.test.ts | 初始狀態 | client 建立後初始狀態為 "connecting" |
| healthRoute.test.ts | Redis 正常 | GET /api/health 回傳 200 + status=ok |
| healthRoute.test.ts | Redis 異常 | GET /api/health 回傳 503 + status=degraded，並帶錯誤訊息 |
| healthRoute.test.ts | timestamp 格式 | 回應內含合法 ISO 時間戳 |

`redisClient.test.ts` 的其中一項測試刻意連到保留 port（1）而非 mock，用意是驗證「真實連線失敗」路徑，而不只是驗證 mock 的行為符合預期。

## 二、手動整合驗證

以下步驟在本次開發環境中實際執行並記錄結果（因沙盒環境無 Docker daemon，改用本機安裝的 `redis-server` 驗證，`docker-compose.yml` 內容本身未受影響）：

### 2.1 TypeScript 型別檢查

```bash
cd backend && npx tsc --noEmit
```
結果：無錯誤輸出（通過）。

### 2.2 Redis 正常時的健康檢查

```bash
curl http://localhost:3001/api/health
```
實際輸出：
```json
{"status":"ok","timestamp":"2026-09-22T06:25:16.506Z","redis":{"state":"connected","connected":true,"latencyMs":1}}
```
HTTP 狀態碼：200 ✓

### 2.3 Redis 斷線時的降級行為

執行 `redis-cli shutdown nosave` 後再次呼叫：
```json
{"status":"degraded","timestamp":"2026-09-22T06:25:33.696Z","redis":{"state":"reconnecting","connected":false,"latencyMs":13252,"error":"Reached the max retries per request limit (which is 3). Refer to \"maxRetriesPerRequest\" option for details."}}
```
HTTP 狀態碼：503 ✓
驗證重點：服務未崩潰、continued running，並誠實回報異常狀態。

### 2.4 前端 Build

```bash
cd frontend && npx nuxt build
```
結果：`✨ Build complete!`（client + server + nitro 皆成功）

### 2.5 前後端整合（SSR）

啟動 backend（port 3001）與 frontend dev server（port 3000）後：
```bash
curl http://localhost:3000/ | grep '服務狀態'
# → 服務狀態：正常
curl http://localhost:3000/ | grep 'Redis 已連線'
# → Redis 已連線：是
```
驗證重點：Nuxt SSR 頁面成功在伺服器端呼叫後端 API 並正確渲染狀態文字，非僅前端 mock 資料。

## 三、已知限制與後續建議

- 本次驗證的 Docker Compose 設定（`docker-compose.yml`）因沙盒環境無 Docker daemon，未能在此環境內實際 `docker compose up` 驗證；已改用等效的本機 Redis 驗證連線邏輯與重試/降級行為。建議在你自己的機器或 CI 環境中額外執行一次 `docker compose up -d redis` + 上述整合測試，確認容器化路徑同樣正常。
- 尚未涵蓋：高併發下的連線池行為、Redis Cluster/Sentinel 情境、正式環境的 TLS 連線。這些超出「基礎架構」範圍，待需要時再補測試。
