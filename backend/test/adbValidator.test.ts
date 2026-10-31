import { describe, it, expect } from "vitest";
import { classifyFlightStatus, unavailableFlightStatus } from "../src/adb/validator.js";
import type { RawAeroDataBoxFlight } from "../src/adb/types.js";

const now = new Date("2026-11-05T00:00:00.000Z");
const expectedDeparture = "2026-11-05T09:00:00.000Z";

function makeFlight(overrides: Partial<RawAeroDataBoxFlight> = {}): RawAeroDataBoxFlight {
  return {
    number: "CI100",
    status: "Expected",
    departure: { scheduledTime: { utc: expectedDeparture } },
    arrival: {},
    ...overrides,
  };
}

describe("classifyFlightStatus", () => {
  it("查無資料時回傳 unknown", () => {
    const result = classifyFlightStatus([], expectedDeparture, now);
    expect(result.status).toBe("unknown");
    expect(result.details).toBeDefined();
  });

  it("狀態為 Cancelled 時回傳 cancelled", () => {
    const result = classifyFlightStatus([makeFlight({ status: "Cancelled" })], expectedDeparture, now);
    expect(result.status).toBe("cancelled");
  });

  it("狀態為 CancelledUncertain 時也回傳 cancelled", () => {
    const result = classifyFlightStatus([makeFlight({ status: "CancelledUncertain" })], expectedDeparture, now);
    expect(result.status).toBe("cancelled");
  });

  it("狀態為 Diverted 時回傳 schedule-changed", () => {
    const result = classifyFlightStatus([makeFlight({ status: "Diverted" })], expectedDeparture, now);
    expect(result.status).toBe("schedule-changed");
  });

  it("狀態為 Unknown/Unstated 時回傳 unknown", () => {
    expect(classifyFlightStatus([makeFlight({ status: "Unknown" })], expectedDeparture, now).status).toBe("unknown");
    expect(classifyFlightStatus([makeFlight({ status: "Unstated" })], expectedDeparture, now).status).toBe("unknown");
  });

  it("時間吻合（無 drift）時回傳 confirmed", () => {
    const result = classifyFlightStatus(
      [makeFlight({ departure: { scheduledTime: { utc: expectedDeparture } } })],
      expectedDeparture,
      now,
    );
    expect(result.status).toBe("confirmed");
  });

  it("實際時間與預期相差超過 60 分鐘時回傳 schedule-changed", () => {
    const drifted = new Date(new Date(expectedDeparture).getTime() + 90 * 60 * 1000).toISOString();
    const result = classifyFlightStatus(
      [makeFlight({ departure: { scheduledTime: { utc: drifted } } })],
      expectedDeparture,
      now,
    );
    expect(result.status).toBe("schedule-changed");
    expect(result.details).toContain("分鐘");
  });

  it("實際時間與預期相差在 60 分鐘內時仍回傳 confirmed", () => {
    const slightlyLate = new Date(new Date(expectedDeparture).getTime() + 30 * 60 * 1000).toISOString();
    const result = classifyFlightStatus(
      [makeFlight({ departure: { scheduledTime: { utc: slightlyLate } } })],
      expectedDeparture,
      now,
    );
    expect(result.status).toBe("confirmed");
  });

  it("優先採用 actualTime 而非 scheduledTime 判斷 drift", () => {
    const drifted = new Date(new Date(expectedDeparture).getTime() + 90 * 60 * 1000).toISOString();
    const result = classifyFlightStatus(
      [
        makeFlight({
          departure: {
            scheduledTime: { utc: expectedDeparture },
            actualTime: { utc: drifted },
          },
        }),
      ],
      expectedDeparture,
      now,
    );
    expect(result.status).toBe("schedule-changed");
  });

  it("缺少出發時間資訊時回傳 unknown", () => {
    const result = classifyFlightStatus([makeFlight({ departure: {} })], expectedDeparture, now);
    expect(result.status).toBe("unknown");
  });

  it("多筆結果時選擇時間最接近 expectedDeparture 的那一筆", () => {
    const closeMatch = makeFlight({
      number: "CI100-A",
      departure: { scheduledTime: { utc: expectedDeparture } },
    });
    const farMatch = makeFlight({
      number: "CI100-B",
      departure: {
        scheduledTime: { utc: new Date(new Date(expectedDeparture).getTime() + 5 * 60 * 60 * 1000).toISOString() },
      },
    });
    const result = classifyFlightStatus([farMatch, closeMatch], expectedDeparture, now);
    expect(result.status).toBe("confirmed");
  });

  it("checkedAt 使用傳入的 now", () => {
    const result = classifyFlightStatus([makeFlight()], expectedDeparture, now);
    expect(result.checkedAt).toBe(now.toISOString());
  });
});

describe("unavailableFlightStatus", () => {
  it("回傳 unknown 並附上原因與 checkedAt", () => {
    const result = unavailableFlightStatus("額度已用盡", now);
    expect(result).toEqual({ status: "unknown", checkedAt: now.toISOString(), details: "額度已用盡" });
  });
});
