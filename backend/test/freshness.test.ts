import { describe, it, expect } from "vitest";
import { classifyFreshness, buildStaleNotice, FRESHNESS_THRESHOLDS } from "../src/cache/freshness.js";

const HOUR = 60 * 60 * 1000;

describe("classifyFreshness", () => {
  it("回傳 fresh，當年齡為 0", () => {
    expect(classifyFreshness(0)).toBe("fresh");
  });

  it("回傳 fresh，剛好等於 4 小時邊界", () => {
    expect(classifyFreshness(FRESHNESS_THRESHOLDS.FRESH_MAX_MS)).toBe("fresh");
  });

  it("回傳 stale-notice，超過 4 小時 1 毫秒", () => {
    expect(classifyFreshness(FRESHNESS_THRESHOLDS.FRESH_MAX_MS + 1)).toBe("stale-notice");
  });

  it("回傳 stale-notice，剛好等於 24 小時邊界", () => {
    expect(classifyFreshness(FRESHNESS_THRESHOLDS.STALE_NOTICE_MAX_MS)).toBe("stale-notice");
  });

  it("回傳 must-validate，超過 24 小時 1 毫秒", () => {
    expect(classifyFreshness(FRESHNESS_THRESHOLDS.STALE_NOTICE_MAX_MS + 1)).toBe("must-validate");
  });

  it("回傳 must-validate，剛好等於 48 小時邊界", () => {
    expect(classifyFreshness(FRESHNESS_THRESHOLDS.MUST_VALIDATE_MAX_MS)).toBe("must-validate");
  });

  it("回傳 discard，超過 48 小時 1 毫秒", () => {
    expect(classifyFreshness(FRESHNESS_THRESHOLDS.MUST_VALIDATE_MAX_MS + 1)).toBe("discard");
  });

  it("回傳 discard，年齡非常大", () => {
    expect(classifyFreshness(365 * 24 * HOUR)).toBe("discard");
  });

  it("負數年齡（時鐘飄移）防禦性地視為 fresh", () => {
    expect(classifyFreshness(-1000)).toBe("fresh");
  });
});

describe("buildStaleNotice", () => {
  it("產生包含正確小時數的提示文字", () => {
    const cachedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T06:30:00Z"); // 6.5 小時後
    const notice = buildStaleNotice(cachedAt, now);
    expect(notice).toContain("6 小時前");
  });
});
