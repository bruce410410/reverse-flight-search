/**
 * Travelpayouts `/v1/prices/cheap` 的 depart_date/return_date 只接受「單一月份」
 * （YYYY-MM）或「單一日期」（YYYY-MM-DD），不支援日期範圍。我們的查詢介面卻是
 * 「去程日期範圍 dateFrom~dateTo」，因此需要：
 *   1. 把使用者的日期範圍拆成「涵蓋的月份清單」，每個月份各查一次；
 *   2. 對回應結果依實際 departure_at 是否落在 [dateFrom, dateTo] 區間內做二次過濾，
 *      避免把「月份內但不在使用者指定範圍內」的日期誤當成候選結果。
 */

/** 從 ISO 日期（YYYY-MM-DD）取出年月（YYYY-MM）。 */
export function isoDateToYearMonth(iso: string): string {
  return iso.slice(0, 7);
}

/** 列出 [fromIso, toIso] 區間涵蓋的所有年月（YYYY-MM），至少包含一個月。 */
export function enumerateMonths(fromIso: string, toIso: string): string[] {
  const [fromY, fromM] = isoDateToYearMonth(fromIso).split("-").map(Number);
  const [toY, toM] = isoDateToYearMonth(toIso).split("-").map(Number);

  const months: string[] = [];
  let y = fromY;
  let m = fromM;

  // 安全上限：避免異常輸入（例如日期範圍長達數十年）造成無限迴圈或過量請求。
  const MAX_MONTHS = 12;

  while ((y < toY || (y === toY && m <= toM)) && months.length < MAX_MONTHS) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return months.length > 0 ? months : [isoDateToYearMonth(fromIso)];
}

/** 判斷一個 ISO datetime 是否落在 [fromIso, toIso]（兩者皆為 YYYY-MM-DD）這個日期區間內。 */
export function isDateWithinRange(isoDatetime: string, fromIso: string, toIso: string): boolean {
  const date = isoDatetime.slice(0, 10);
  return date >= fromIso && date <= toIso;
}
