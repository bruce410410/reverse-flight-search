import { describe, it, expect, vi, afterEach } from "vitest";
import { AeroDataBoxClient } from "../src/adb/client.js";
import {
  AeroDataBoxHttpError,
  AeroDataBoxNetworkError,
  AeroDataBoxNotConfiguredError,
  AeroDataBoxRateLimitError,
  AeroDataBoxTimeoutError,
} from "../src/adb/errors.js";
import { loadEnv, __resetEnvCacheForTests } from "../src/config/env.js";

function makeEnv(overrides: Record<string, string> = {}) {
  __resetEnvCacheForTests();
  return loadEnv({ AERODATABOX_API_KEY: "test-key", AERODATABOX_REQUEST_TIMEOUT_MS: "1000", ...overrides });
}

describe("AeroDataBoxClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetEnvCacheForTests();
  });

  it("isConfigured() 反映 API key 是否已設定", () => {
    expect(new AeroDataBoxClient(makeEnv()).isConfigured()).toBe(true);
    expect(new AeroDataBoxClient(makeEnv({ AERODATABOX_API_KEY: "" })).isConfigured()).toBe(false);
  });

  it("未設定 API key 時直接拋出 AeroDataBoxNotConfiguredError，不會發送請求", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const client = new AeroDataBoxClient(makeEnv({ AERODATABOX_API_KEY: "" }));

    await expect(client.getFlightStatus("CI", 100, "2026-11-05")).rejects.toThrow(AeroDataBoxNotConfiguredError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("正確組裝 URL 與 RapidAPI headers", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const client = new AeroDataBoxClient(makeEnv());

    await client.getFlightStatus("CI", 100, "2026-11-05");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("/flights/number/CI100/2026-11-05");

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-RapidAPI-Key"]).toBe("test-key");
    expect(headers["X-RapidAPI-Host"]).toBe("aerodatabox.p.rapidapi.com");
  });

  it("404 時視為查無資料，回傳空陣列而非拋出錯誤", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    const client = new AeroDataBoxClient(makeEnv());

    const result = await client.getFlightStatus("CI", 999, "2026-11-05");
    expect(result).toEqual([]);
  });

  it("成功時回傳解析後的 JSON 陣列", async () => {
    const payload = [{ number: "CI100", status: "Expected" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 })));
    const client = new AeroDataBoxClient(makeEnv());

    const result = await client.getFlightStatus("CI", 100, "2026-11-05");
    expect(result).toEqual(payload);
  });

  it("429 時拋出 AeroDataBoxRateLimitError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 429, headers: { "retry-after": "15" } })),
    );
    const client = new AeroDataBoxClient(makeEnv());

    try {
      await client.getFlightStatus("CI", 100, "2026-11-05");
      expect.unreachable("預期應該拋出錯誤");
    } catch (err) {
      expect(err).toBeInstanceOf(AeroDataBoxRateLimitError);
      expect((err as AeroDataBoxRateLimitError).retryAfterSeconds).toBe(15);
    }
  });

  it("其他 4xx/5xx 時拋出 AeroDataBoxHttpError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Invalid number" }), { status: 400 })),
    );
    const client = new AeroDataBoxClient(makeEnv());

    await expect(client.getFlightStatus("CI", 100, "2026-11-05")).rejects.toThrow(AeroDataBoxHttpError);
  });

  it("網路層級錯誤轉為 AeroDataBoxNetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    const client = new AeroDataBoxClient(makeEnv());

    await expect(client.getFlightStatus("CI", 100, "2026-11-05")).rejects.toThrow(AeroDataBoxNetworkError);
  });

  it("逾時時拋出 AeroDataBoxTimeoutError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );
    const client = new AeroDataBoxClient(makeEnv({ AERODATABOX_REQUEST_TIMEOUT_MS: "50" }));

    await expect(client.getFlightStatus("CI", 100, "2026-11-05")).rejects.toThrow(AeroDataBoxTimeoutError);
  }, 10_000);
});
