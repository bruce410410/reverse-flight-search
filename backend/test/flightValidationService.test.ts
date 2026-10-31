import { describe, it, expect, vi } from "vitest";
import { FlightValidationService } from "../src/adb/flightValidationService.js";
import { AeroDataBoxHttpError, AeroDataBoxTimeoutError } from "../src/adb/errors.js";
import type { AeroDataBoxClient } from "../src/adb/client.js";
import type { FlightOffer } from "../src/types/flight.js";

const now = new Date("2026-11-05T00:00:00.000Z");

function makeOffer(origin: string, overrides: Partial<FlightOffer> = {}): FlightOffer {
  return {
    origin,
    originCity: origin,
    originCountry: "Test",
    price: 1000,
    currency: "TWD",
    airlines: ["CI"],
    departureAt: "2026-11-05T09:00:00.000Z",
    arrivalAt: "2026-11-05T12:00:00.000Z",
    durationMinutes: 180,
    stopovers: 0,
    bookingToken: "token",
    deepLink: "https://kiwi.com/x",
    segments: [
      {
        airlineIata: "CI",
        flightNumber: 100,
        departureAirport: origin,
        arrivalAirport: "TPE",
        departureAt: "2026-11-05T09:00:00.000Z",
        arrivalAt: "2026-11-05T12:00:00.000Z",
      },
    ],
    flightStatus: { status: "not-checked" },
    ...overrides,
  };
}

function makeClient(opts: { configured?: boolean; impl?: (...args: unknown[]) => unknown } = {}) {
  return {
    isConfigured: vi.fn().mockReturnValue(opts.configured ?? true),
    getFlightStatus: vi.fn().mockImplementation(opts.impl ?? (async () => [])),
  } as unknown as AeroDataBoxClient;
}

describe("FlightValidationService", () => {
  it("topN 為 0 時完全不呼叫 client，offers 原樣返回", async () => {
    const client = makeClient();
    const service = new FlightValidationService(client, 0);
    const offers = [makeOffer("NRT"), makeOffer("HKG")];

    const result = await service.validateTopOffers(offers, now);

    expect(result).toBe(offers);
    expect(client.getFlightStatus).not.toHaveBeenCalled();
  });

  it("client 未設定（無 API key）時完全不呼叫，offers 原樣返回", async () => {
    const client = makeClient({ configured: false });
    const service = new FlightValidationService(client, 5);
    const offers = [makeOffer("NRT")];

    const result = await service.validateTopOffers(offers, now);

    expect(result).toBe(offers);
    expect(client.getFlightStatus).not.toHaveBeenCalled();
  });

  it("只驗證前 topN 筆，其餘維持 not-checked", async () => {
    const client = makeClient({
      impl: async () => [{ number: "CI100", status: "Expected", departure: { scheduledTime: { utc: "2026-11-05T09:00:00.000Z" } }, arrival: {} }],
    });
    const service = new FlightValidationService(client, 1);
    const offers = [makeOffer("NRT"), makeOffer("HKG"), makeOffer("ICN")];

    const result = await service.validateTopOffers(offers, now);

    expect(client.getFlightStatus).toHaveBeenCalledTimes(1);
    expect(result[0].flightStatus.status).toBe("confirmed");
    expect(result[1].flightStatus.status).toBe("not-checked");
    expect(result[2].flightStatus.status).toBe("not-checked");
  });

  it("沒有航段資料時標記為 unknown 並附說明，不呼叫 client", async () => {
    const client = makeClient();
    const service = new FlightValidationService(client, 5);
    const offers = [makeOffer("NRT", { segments: [] })];

    const result = await service.validateTopOffers(offers, now);

    expect(client.getFlightStatus).not.toHaveBeenCalled();
    expect(result[0].flightStatus.status).toBe("unknown");
  });

  it("AeroDataBox API 錯誤時該筆標記 unknown，不會拋出例外拖垮呼叫端", async () => {
    const client = makeClient({
      impl: async () => {
        throw new AeroDataBoxHttpError(500, "upstream down");
      },
    });
    const logger = { warn: vi.fn() };
    const service = new FlightValidationService(client, 5, logger);
    const offers = [makeOffer("NRT")];

    const result = await service.validateTopOffers(offers, now);

    expect(result[0].flightStatus.status).toBe("unknown");
    expect(result[0].flightStatus.details).toContain("即時校驗服務暫時無法使用");
    expect(logger.warn).toHaveBeenCalled();
  });

  it("逾時錯誤時同樣標記 unknown 而不拋出", async () => {
    const client = makeClient({
      impl: async () => {
        throw new AeroDataBoxTimeoutError(8000);
      },
    });
    const service = new FlightValidationService(client, 5);
    const offers = [makeOffer("NRT")];

    const result = await service.validateTopOffers(offers, now);
    expect(result[0].flightStatus.status).toBe("unknown");
  });

  it("多筆候選出發地會並行驗證，個別結果互不影響", async () => {
    let callCount = 0;
    const client = makeClient({
      impl: async (...args: unknown[]) => {
        callCount += 1;
        const flightNumber = args[1] as number;
        if (flightNumber === 999) throw new AeroDataBoxHttpError(500, "boom");
        return [{ number: "CI", status: "Cancelled", departure: {}, arrival: {} }];
      },
    });
    const service = new FlightValidationService(client, 5);
    const offers = [
      makeOffer("NRT"),
      makeOffer("HKG", {
        segments: [
          {
            airlineIata: "CI",
            flightNumber: 999,
            departureAirport: "HKG",
            arrivalAirport: "TPE",
            departureAt: "2026-11-05T09:00:00.000Z",
            arrivalAt: "2026-11-05T12:00:00.000Z",
          },
        ],
      }),
    ];

    const result = await service.validateTopOffers(offers, now);

    expect(callCount).toBe(2);
    expect(result[0].flightStatus.status).toBe("cancelled");
    expect(result[1].flightStatus.status).toBe("unknown");
  });
});
