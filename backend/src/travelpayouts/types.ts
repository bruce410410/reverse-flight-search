/** Travelpayouts `/v1/prices/cheap` 的原始回應型別（僅列出我們實際使用的欄位）。 */
export interface RawTravelpayoutsOfferEntry {
  price: number;
  airline: string;
  flight_number: number;
  departure_at: string;
  return_at?: string;
  expires_at?: string;
}

export interface RawTravelpayoutsCheapResponse {
  success: boolean;
  /** key 是查詢時指定的 destination 代碼；value 是「索引 → 票價選項」的字典 */
  data?: Record<string, Record<string, RawTravelpayoutsOfferEntry>>;
  error?: string;
}
