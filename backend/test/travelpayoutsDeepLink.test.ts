import { describe, it, expect } from "vitest";
import { buildAviasalesDeepLink } from "../src/travelpayouts/deepLink.js";

describe("buildAviasalesDeepLink", () => {
  it("單程：只有出發地 DDMM，沒有回程 DDMM", () => {
    const link = buildAviasalesDeepLink({
      origin: "NRT",
      destination: "TPE",
      departureAt: "2026-11-05T09:00:00.000Z",
    });
    expect(link).toBe("https://www.aviasales.com/?params=NRT0511TPE1");
  });

  it("來回：出發地與回程 DDMM 都要有", () => {
    const link = buildAviasalesDeepLink({
      origin: "NRT",
      destination: "TPE",
      departureAt: "2026-07-16T09:00:00.000Z",
      returnAt: "2026-07-20T09:00:00.000Z",
    });
    expect(link).toBe("https://www.aviasales.com/?params=NRT1607TPE20071");
  });
});
