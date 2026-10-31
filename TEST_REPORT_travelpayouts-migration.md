# 測試報告 — 資料來源改版：Kiwi Tequila → Travelpayouts（Aviasales）Data API

日期：2026-09-22
範圍：`travelpayouts/`（新模組，取代 `kiwi/`）、`search/reverseSearchService.ts`、`routes/reverseSearch.ts`、`server.ts`、`config/env.ts`、`types/flight.ts`、前端 `types/reverseSearch.ts`、`components/ResultList.vue`

## 一、觸發原因

使用者實際查證後發現 Kiwi Tequila API 已改為「僅限受邀合作夥伴」，一般開發者無法再自助註冊取得 API 金鑰（舊教學裡的公開自助流程已不存在）。我進一步網路查證確認：

- Kiwi 官方（media.kiwi.com 的合作夥伴公告）明確表示新合作採邀請制，既有合作夥伴不受影響，但新申請者無法自助開通。
- 同時查到 **Amadeus Self-Service API 也已於 2026 年 7 月關閉新開發者自助申請**，進一步確認「多數大型機票 API 都在收緊自助存取」是這段時間的整體趨勢，不是 Kiwi 單一個案。

因此原本「候選出發地策略仍待真實金鑰驗證」的殘留風險（見 `TEST_REPORT_anywhere-verification.md`）已經沒有驗證的機會，需要整個換掉資料來源。

## 二、為什麼選 Travelpayouts（Aviasales）Data API

實際查證了 5 個候選方案，篩選標準是「（a）現在還能自助免費申請、（b）能撐住『目的地反查』這個核心需求」：

| 候選方案 | 自助申請 | 免費 | 結論 |
|---|---|---|---|
| Kiwi Tequila | ❌ 已改邀請制 | - | 淘汰 |
| Amadeus Self-Service | ❌ 2026-07 已關閉新申請 | - | 淘汰 |
| Duffel | ✅ | 免審核帳號只能拿 sandbox 假資料 | 淘汰（不是真實票價） |
| FlightAPI.io | ✅ | 點數制，免費額度不明確；且一樣要求 origin+destination，不支援反查 | 淘汰 |
| **Travelpayouts（Aviasales）Data API** | ✅ 官方文件明確：「不限流量門檻，註冊帳號即可拿 token」 | ✅ | **採用** |

Travelpayouts 是目前唯一確認「免費、自助、立即可用」的選項，但它的 `/v1/prices/cheap` 端點跟 Kiwi 一樣要求指定單一 `origin`，沒有「目的地反查全球」的原生端點——這點跟原本 Kiwi 版本的「候選出發地清單」設計理念相符，因此沿用同一套架構（見下方「架構異動」）。

## 三、架構異動

### 候選出發地：從「國家清單」改成「機場清單」

Kiwi 版本用 `fly_from=Country:XX,Country:YY,...`（多國家一次查詢）。Travelpayouts 的 `origin` 參數只接受單一 IATA 城市代碼，沒有地點群組語法，因此改成：對候選清單裡每個機場（`travelpayouts/candidateOrigins.ts`，預設 28 個代表性機場，沿用原本 27 個國家的市場涵蓋範圍）各平行打一次請求，內部彙整。這正是原本 Kiwi 版本文件裡「若逗號分隔多地點不受支援，退路是拆成多次平行請求」的備援方案（見 `TEST_REPORT_anywhere-verification.md` 第五節），現在直接成為主要實作。

### 日期範圍處理

`/v1/prices/cheap` 的 `depart_date` 只接受單一月份（YYYY-MM）或單一日期，不支援「日期範圍」。改用 `travelpayouts/dateUtil.ts` 把查詢的 `dateFrom~dateTo` 拆成涵蓋的月份清單（每個候選出發地 × 每個月份各查一次），拿到回應後再依實際 `departure_at`（以及 round-trip 情境的 `return_at`）二次過濾，確保回傳的候選出發地確實落在使用者指定的日期區間內，而不是「月份內但日期不對」的資料。

### 介面簡化：`ReverseSearchService` 不再依賴 provider 的原始回應格式

原本 `reverseSearchService.ts` 呼叫 `kiwiClient.searchReverseFlights()` 拿到原始回應，再呼叫 `buildCandidateOrigins()` 做 mapping。改版後 `TravelpayoutsClient.searchReverseFlights()` 直接回傳已經 map 完、去重、排序、截斷好的 `FlightOffer[]`，`reverseSearchService.ts` 不再需要認識任何 provider 專屬的原始型別，日後若要再換資料源，異動範圍會更小。

### 型別異動：`FlightOffer` 部分欄位改為 optional

`/v1/prices/cheap` 不提供抵達時間、飛行時長、轉機次數、booking token（只有出發時間、航空公司、班號、價格、失效時間）。`types/flight.ts` 的 `FlightOffer.arrivalAt` / `durationMinutes` / `stopovers` / `bookingToken`（以及 `FlightSegment.arrivalAt`）都改為 optional，新增 `priceExpiresAt`。前端 `ResultList.vue` 對應調整為「欄位不存在就不顯示該區塊」，不顯示假造的 0 或字串。已確認 `AeroDataBox` 即時校驗完全不受影響——校驗只依賴 `airlineIata` / `flightNumber` / `departureAt` 的日期部分，不用 `arrivalAt`。

### 訂票深連結

Kiwi 提供的 `deep_link` 換成用 Travelpayouts 官方文件的 Aviasales 深連結格式自行組出（`travelpayouts/deepLink.ts`），格式為 `https://www.aviasales.com/?params={出發地}{DDMM}{目的地}[{回程DDMM}]{乘客數}`。這是目前唯一沒有真實 token 也能組出、且有官方文件範例可以反推格式的做法。

## 四、自動化測試

```bash
cd backend && npm run typecheck   # npx tsc --noEmit
cd backend && npm test            # vitest run
```

typecheck：全過，無錯誤。

測試結果：
```
 Test Files  15 passed (15)
      Tests  98 passed (98)
```

新增測試檔案：
- `test/travelpayoutsCandidateOrigins.test.ts`（5 項）：預設清單無重複、格式正確、覆寫解析、未知代碼容錯
- `test/travelpayoutsDateUtil.test.ts`（5 項）：年月轉換、單月/跨月列舉、安全上限、日期區間邊界判斷
- `test/travelpayoutsDeepLink.test.ts`（2 項）：單程/來回深連結格式
- `test/travelpayoutsMapper.test.ts`（4 項）：原始資料 → FlightOffer 轉換（含選填欄位缺席）、候選出發地彙整/排序/截斷
- `test/travelpayoutsClient.test.ts`（6 項）：未設定 token 直接失敗、多出發地平行查詢彙整、日期範圍過濾、單一出發地失敗不影響其他、全部失敗時拋聚合錯誤、候選出發地等於目的地時跳過

修改既有測試：`test/reverseSearchService.test.ts`、`test/reverseSearchRoute.test.ts` 改用 `TravelpayoutsClient` / `TravelpayoutsHttpError` 等新介面與錯誤類別，情境覆蓋範圍不變（原本 Kiwi 版本測的所有快取分級情境全部保留）。

移除：整個 `src/kiwi/` 模組與對應測試（`tequilaClient.test.ts`、`candidateOrigins.test.ts`、`mapper.test.ts`、`dateFormat.test.ts`）——不再使用，保留只會造成混淆。

## 五、殘留風險（下一步應優先驗證）

- **完全沒有真實 Travelpayouts token 驗證過整合**：`/v1/prices/cheap` 是否真的支援 TWD 貨幣、`depart_date=YYYY-MM` 實際回傳的資料涵蓋範圍、`token` 參數用 query string 還是 header 兩種寫法是否都有效（目前兩者都送，見 `client.ts`），都需要拿到真實 token 後第一時間驗證。
- **資料新鮮度語意改變**：Travelpayouts 的 `/v1/prices/cheap` 本質上是「他們自己定期爬取、快取的票價資料庫」，不是即時查詢。本系統的 4 層快取鮮度判斷原本假設「must-validate / discard 這兩層會打一次真正的 Live API」，換成 Travelpayouts 後，所謂的「即時校驗」拿到的其實還是對方的快取資料，只是比我們自己的 Redis 快取新一點。這個語意落差已寫入 README「已知限制」，但邏輯本身沒有能力偵測或提示使用者這件事，需要使用者知情。
- **Aviasales 深連結格式未經真實驗證**：格式是從官方支援文件的範例反推，沒有真實情境測試過點擊後是否正確導向。
- **候選機場清單人工篩選、非窮舉**：跟 Kiwi 版本一樣的限制，沿用同一份市場涵蓋範圍決策。
