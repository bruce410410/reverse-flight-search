# 測試報告 — fly_from=anywhere 假設驗證與備援策略

日期：2026-09-22
範圍：`kiwi/candidateOrigins.ts`、`kiwi/tequilaClient.ts` 的 fly_from 組裝邏輯

## 一、研究結論：fly_from=anywhere 假設不成立（證據強度：中等，仍需真實金鑰最終確認）

本環境沒有 Kiwi 正式 API key，無法直接打 API 驗證。改用網路研究盡可能收斂不確定性，關鍵發現來自社群維護的 Tequila API R 套件（[rflights](https://github.com/jcrodriguez1989/rflights)）及其[函式文件](https://rdrr.io/github/jcrodriguez1989/rflights/man/get_flights.html)：

- **`fly_to` 參數的文件明確列出 `"anywhere"` 是合法的特殊值**，對應 Kiwi 官網「不限目的地」探索型搜尋功能。
- **`fly_from` 參數的文件描述是「a vector of IDs of the departure locations」**，範例是 `c("City:cordoba_cd_ar", "City:mendoza_md_ar")`——多個具體地點 ID 組成的清單，格式為 `"City:xxx"` 或 `"Country:XX"` 這類前綴形式，而不是一個字面意義的萬用字元。
- 搜尋多個管道（GitHub、npm SDK、Tequila 官方文件首頁、社群文章）**沒有找到任何來源顯示 `fly_from` 接受 `"anywhere"`**。

**結論**：原本「`fly_from=anywhere` 可行」的假設證據不足，且與找到的文件描述（`fly_from` 是特定地點 ID 清單，`anywhere` 只在 `fly_to` 有文件支持）相衝突。因此判斷為「風險偏高，應主動處理」，已將原本設計為「日後備援」的策略提升為現在就實作的**主要**方案。

## 二、新方案：候選出發地（國家層級）清單

不再送出 `fly_from=anywhere`，改為送出一組「國家層級」地點 ID（格式 `Country:XX`），用逗號分隔在**同一次請求**中送出——這個「多個地點 ID 逗號組成一個 fly_from」的用法，直接對應 rflights 文件裡的範例格式，證據強度比原本好上不少。

- 預設清單涵蓋 27 個國家、橫跨東亞、東南亞/南亞、美洲、歐洲、中東、大洋洲/非洲（見 `kiwi/candidateOrigins.ts`），讓「全球反向搜尋」名符其實。
- 可透過 `KIWI_CANDIDATE_ORIGIN_COUNTRIES` 環境變數覆寫（逗號分隔的 ISO 3166-1 alpha-2 代碼），不需改程式碼即可調整涵蓋範圍或縮小測試範圍。
- `ReverseSearchService`、`FlightValidationService`、路由層完全不需要修改——這個決定當初設計 `KiwiTequilaClient.searchReverseFlights` 介面時就已經考慮到，只有 client 內部的 URL 組裝邏輯改變。

## 三、自動化測試

```bash
cd backend && npm test
```

新增/修改：
- `test/candidateOrigins.test.ts`（6 項）：轉換格式正確、大小寫與空白處理、空字串過濾、預設清單無重複且橫跨多洲、每個元素格式合法
- `test/tequilaClient.test.ts` 更新既有測試（不再斷言 `fly_from === "anywhere"`，改為驗證 `Country:` 前綴格式），新增 1 項驗證 `KIWI_CANDIDATE_ORIGIN_COUNTRIES` 環境變數覆寫邏輯正確運作

全部測試結果：
```
 Test Files  14 passed (14)
      Tests  102 passed (102)
```

## 四、手動驗證

用真實程式碼路徑（非 mock 邏輯重寫）實際組裝一次請求 URL，確認：
```
fly_from=Country:JP,Country:KR,Country:CN,Country:TW,Country:HK,Country:SG,Country:TH,Country:MY,
         Country:VN,Country:PH,Country:ID,Country:IN,Country:US,Country:CA,Country:MX,Country:BR,
         Country:GB,Country:DE,Country:FR,Country:NL,Country:ES,Country:IT,Country:CH,Country:AE,
         Country:SA,Country:AU,Country:NZ,Country:ZA
fly_to=TPE
```
（URL 中實際為百分比編碼，上方為可讀格式）✓ 27 個國家全數正確組裝、逗號分隔、`Country:` 前綴格式正確。

## 五、殘留風險

- 這仍然是**未經真實金鑰驗證**的假設，只是證據強度從「幾乎沒有根據」提升到「有具體文件範例支持的同類用法」。拿到正式金鑰後應優先驗證：(a) 逗號分隔的多國家 `fly_from` 真的會回傳來自不同國家的候選出發地；(b) 單次請求可接受的地點數量上限（27 個國家是否超過限制）。
- 若驗證後發現逗號分隔多地點不受支援，退路是把同一組國家清單拆成多次平行請求（每次一個國家）後在 `KiwiTequilaClient` 內部合併結果——`searchReverseFlights` 的對外介面不需要改變，呼叫端也不受影響。
- 國家清單本身是人工篩選、非窮舉，可能遺漏部分次要但仍有低價航班的市場；已透過環境變數做成可調整項目，方便後續依實際資料調整覆蓋範圍。
