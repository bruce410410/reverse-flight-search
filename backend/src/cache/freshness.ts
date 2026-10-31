import type { FreshnessTier } from "../types/flight.js";

const HOUR_MS = 60 * 60 * 1000;

/** 4 層快取鮮度判斷的時間邊界（毫秒）。 */
export const FRESHNESS_THRESHOLDS = {
  /** <= 4h：極高準確，直接使用快取 */
  FRESH_MAX_MS: 4 * HOUR_MS,
  /** <= 24h：提示更新時間，使用快取但附上提示 */
  STALE_NOTICE_MAX_MS: 24 * HOUR_MS,
  /** <= 48h：強迫校驗，必須打 Live API 確認後才能回傳 */
  MUST_VALIDATE_MAX_MS: 48 * HOUR_MS,
} as const;

/**
 * 依快取年齡判斷應採取的鮮度分級。
 *
 * 規則（專案規範）：
 *   ageMs <= 4h   → "fresh"         極高準確，直接使用快取
 *   ageMs <= 24h  → "stale-notice"  使用快取，但需提示使用者資料更新時間
 *   ageMs <= 48h  → "must-validate" 不可直接使用快取，必須先打 Live API 校驗
 *   ageMs > 48h   → "discard"       捨棄快取，視同 cache miss，全新查詢
 */
export function classifyFreshness(ageMs: number): FreshnessTier {
  if (ageMs < 0) {
    // 理論上不會發生（快取時間不會晚於現在），但防禦性地視為最新鮮，
    // 避免因為時鐘飄移等異常狀況誤判為「必須捨棄」。
    return "fresh";
  }
  if (ageMs <= FRESHNESS_THRESHOLDS.FRESH_MAX_MS) return "fresh";
  if (ageMs <= FRESHNESS_THRESHOLDS.STALE_NOTICE_MAX_MS) return "stale-notice";
  if (ageMs <= FRESHNESS_THRESHOLDS.MUST_VALIDATE_MAX_MS) return "must-validate";
  return "discard";
}

/** 產生 <=24h 情境要顯示給使用者的中文提示文字。 */
export function buildStaleNotice(cachedAt: Date, now: Date): string {
  const ageMs = now.getTime() - cachedAt.getTime();
  const ageHours = Math.floor(ageMs / HOUR_MS);
  return `此資料為 ${ageHours} 小時前查詢的結果，實際票價可能已有變動`;
}
