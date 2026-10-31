import { describe, it, expect } from "vitest";
import { reverseSearchRequestSchema } from "../src/routes/reverseSearchSchema.js";

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

describe("reverseSearchRequestSchema", () => {
  it("接受合法的 one-way 查詢，並套用預設值", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "tpe",
      dateFrom: futureDate(10),
      dateTo: futureDate(15),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.destination).toBe("TPE");
      expect(result.data.tripType).toBe("one-way");
      expect(result.data.currency).toBe("TWD");
      expect(result.data.maxResults).toBe(20);
    }
  });

  it("拒絕不是 3 碼的 destination", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "TAIPEI",
      dateFrom: futureDate(10),
      dateTo: futureDate(15),
    });
    expect(result.success).toBe(false);
  });

  it("拒絕過去的 dateFrom", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "TPE",
      dateFrom: "2020-01-01",
      dateTo: "2020-01-05",
    });
    expect(result.success).toBe(false);
  });

  it("拒絕 dateTo 早於 dateFrom", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "TPE",
      dateFrom: futureDate(15),
      dateTo: futureDate(10),
    });
    expect(result.success).toBe(false);
  });

  it("round-trip 缺少回程日期時拒絕", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "TPE",
      dateFrom: futureDate(10),
      dateTo: futureDate(15),
      tripType: "round-trip",
    });
    expect(result.success).toBe(false);
  });

  it("round-trip 回程早於去程時拒絕", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "TPE",
      dateFrom: futureDate(10),
      dateTo: futureDate(15),
      tripType: "round-trip",
      returnDateFrom: futureDate(5),
      returnDateTo: futureDate(8),
    });
    expect(result.success).toBe(false);
  });

  it("接受合法的 round-trip 查詢", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "TPE",
      dateFrom: futureDate(10),
      dateTo: futureDate(15),
      tripType: "round-trip",
      returnDateFrom: futureDate(20),
      returnDateTo: futureDate(25),
    });
    expect(result.success).toBe(true);
  });

  it("拒絕超出範圍的 maxResults", () => {
    const result = reverseSearchRequestSchema.safeParse({
      destination: "TPE",
      dateFrom: futureDate(10),
      dateTo: futureDate(15),
      maxResults: 500,
    });
    expect(result.success).toBe(false);
  });
});
