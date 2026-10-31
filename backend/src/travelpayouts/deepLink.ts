/**
 * 組出 Aviasales 搜尋結果深連結。
 *
 * 格式依 Travelpayouts 官方文件（Aviasales affiliate links）：
 *   https://www.aviasales.com/?params={ORIGIN}{DDMM}{DESTINATION}[{DDMM 回程}][艙等]{乘客人數}
 * 例：巴黎→紐約 7/16 出發、7/20 回程、3 大人 2 小孩 1 嬰兒、商務艙
 *   => PAR1607NYC2007c321
 * 艙等字母：空字串＝經濟艙，w＝優選經濟艙，c＝商務艙，f＝頭等艙（本系統一律用經濟艙）。
 * 乘客人數固定為 1 大人（本系統目前不支援指定乘客人數，見 types/flight.ts ReverseSearchQuery）。
 *
 * 殘留風險：這個格式來自官方支援文件的範例反推，沒有真實 API token 可以實際
 * 開啟連結驗證跳轉是否正確；文件本身也提到要用 Travelpayouts 後台的產連結工具
 * 掛上聯盟行銷 marker 才能追蹤分潤，本函式產生的是「不含 marker 的陽春版」，
 * 純粹讓使用者點了能跳去對應的搜尋結果頁。
 */
function toDDMM(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}${month}`;
}

export function buildAviasalesDeepLink(params: {
  origin: string;
  destination: string;
  departureAt: string;
  returnAt?: string;
}): string {
  const { origin, destination, departureAt, returnAt } = params;
  const routePart = `${origin}${toDDMM(departureAt)}${destination}`;
  const returnPart = returnAt ? toDDMM(returnAt) : "";
  const passengers = "1"; // 固定 1 大人、經濟艙
  return `https://www.aviasales.com/?params=${routePart}${returnPart}${passengers}`;
}
