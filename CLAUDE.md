# reverse-flight-search

目的地導向、不設出發地的反向機票搜尋，另含「聰明旅人工具箱」（路痴救星等）。通用行為準則見 `~/.claude/CLAUDE.md` 與 `~/projects/CLAUDE.md`，這裡只放本專案的事。

## 結構與指令

monorepo：`backend/`（Node.js、TypeScript、Fastify、Redis、zod）＋ `frontend/`（Nuxt 3、Vue 3、TypeScript）。測試用 Vitest。

| 位置 | 指令 | 說明 |
|---|---|---|
| backend | `npm run dev` | 啟動於 :3011（tsx watch） |
| backend | `npm test` ／ `npm run typecheck` | `vitest run` ／ `tsc --noEmit` |
| frontend | `npm run dev` | 啟動於 :3000 |
| frontend | `npm test` ／ `npm run typecheck` | `vitest run` ／ `nuxt typecheck` |
| 根目錄 | `./start.sh` ／ `./stop.sh` | 一次啟動／停止；用 `backend/scripts/mini-redis.mjs`，不需 Docker |

也可改用 `docker compose up -d redis` 提供 Redis。

## 資料來源（容易搞錯）

- **使用中**（以 `backend/src/server.ts` 的接線為準）：SerpAPI（`backend/src/serpapi/`，查票）、AeroDataBox（`backend/src/adb/`，即時航班狀態校驗）。
- **備用、未接上**：`backend/src/skyscrapper/`、`amadeus/`、`duffel/`、`travelpayouts/`。`routes/reverseSearch.ts` 仍引用 `skyscrapper/errors.js` 的錯誤類型。
- **README 已過時**：README 仍寫 Sky-scrapper 為使用中，且沒提到 SerpAPI。資料來源以 `server.ts` 為準，不以 README 為準。
- 資料來源改過多次（Kiwi → Travelpayouts → Duffel → Sky-scrapper → SerpAPI），前四次的原因記錄在 README 與 `TEST_REPORT_*.md`；SerpAPI 這次沒有文件記錄。

## 專案內已有的做法（新程式碼比照）

- 環境變數與請求內容在邊界用 zod 驗證：`backend/src/config/env.ts`、`backend/src/routes/reverseSearchSchema.ts`。
- 快取鮮度分 4 層（≤4h／≤24h／≤48h／>48h）：`backend/src/cache/freshness.ts`。
- 航班校驗服務設計為容錯、不拋出例外：`backend/src/adb/flightValidationService.ts`。
- 路痴救星的 Google Maps API Key 由使用者自備，只存在瀏覽器 localStorage，不送後端；核心邏輯在 `frontend/utils/storyboard.ts`。

## 注意

- `backend/.env`、`frontend/.env` 含 API 金鑰，已被 `.gitignore` 排除。不讀取、不修改、不提交；範本是各自的 `.env.example`。
- `backend/.env.example.testwrite` 是殘留的測試產物，未被追蹤，不要當作範本。
