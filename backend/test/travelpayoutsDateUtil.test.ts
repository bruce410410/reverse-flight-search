import { describe, it, expect } from "vitest";
import { enumerateMonths, isDateWithinRange, isoDateToYearMonth } from "../src/travelpayouts/dateUtil.js";

describe("travelpayouts dateUtil", () => {
  it("isoDateToYearMonth 取出年月", () => {
    expect(isoDateToYearMonth("2026-11-05")).toBe("2026-11");
  });

  it("enumerateMonths 同一個月時只回傳一個月份", () => {
    expect(enumerateMonths("2026-11-05", "2026-11-20")).toEqual(["2026-11"]);
  });

  it("enumerateMonths 跨月時回傳涵蓋的每個月份", () => {
    expect(enumerateMonths("2026-11-25", "2027-01-05")).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("enumerateMonths 有安全上限，避免異常輸入造成過量月份", () => {
    const months = enumerateMonths("2020-01-01", "2030-01-01");
    expect(months.length).toBeLessThanOrEqual(12);
  });

  it("isDateWithinRange 正確判斷邊界（含頭含尾）", () => {
    expect(isDateWithinRange("2026-11-05T09:00:00Z", "2026-11-05", "2026-11-10")).toBe(true);
    expect(isDateWithinRange("2026-11-10T23:59:00Z", "2026-11-05", "2026-11-10")).toBe(true);
    expect(isDateWithinRange("2026-11-04T23:59:00Z", "2026-11-05", "2026-11-10")).toBe(false);
    expect(isDateWithinRange("2026-11-11T00:00:00Z", "2026-11-05", "2026-11-10")).toBe(false);
  });
});
