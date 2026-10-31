import type { Redis } from "ioredis";
import type { AppEnv } from "../config/env.js";
import type { RawSkyscrapperAirportSearchResponse } from "./types.js";
import {
  SkyscrapperEntityResolutionError,
  SkyscrapperHttpError,
  SkyscrapperNetworkError,
  SkyscrapperRateLimitError,
  SkyscrapperTimeoutError,
} from "./errors.js";

export interface ResolvedSkyscrapperEntity {
  skyId: string;
  entityId: string;
}

const CACHE_KEY_PREFIX = "skyscrapper:entity:";

/**
 * 把一個 IATA 機場代碼解析成 Sky-scrapper 需要的 skyId/entityId 配對
 * （api/v1/flights/searchFlights 兩者都要，不能只給 IATA 代碼）。
 *
 * 解析結果會被永久性地快取在 Redis（TTL 見 SKYSCRAPPER_ENTITY_CACHE_TTL_SECONDS，
 * 預設 30 天）——這是免費額度（每月 100 次）逼出來的設計：機場代碼對應的
 * entityId 幾乎不會變動，沒必要每次查詢都重新解析、白白燒掉呼叫額度。
 * 實際效果是：候選出發地清單裡的機場只有「第一次」被查詢時要多花一次
 * searchAirport 呼叫，之後同一個機場的解析結果會一路沿用到快取過期。
 */
export class SkyscrapperEntityResolver {
  constructor(
    private readonly env: AppEnv,
    private readonly redis: Redis,
  ) {}

  async resolve(iata: string): Promise<ResolvedSkyscrapperEntity> {
    const normalized = iata.trim().toUpperCase();

    const cached = await this.getCached(normalized);
    if (cached) return cached;

    const resolved = await this.fetchAndParse(normalized);
    await this.setCached(normalized, resolved);
    return resolved;
  }

  private async getCached(iata: string): Promise<ResolvedSkyscrapperEntity | null> {
    try {
      const raw = await this.redis.get(CACHE_KEY_PREFIX + iata);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ResolvedSkyscrapperEntity;
      if (typeof parsed.skyId === "string" && typeof parsed.entityId === "string") {
        return parsed;
      }
      return null;
    } catch {
      // Redis 讀取失敗不該擋住查詢——退化為每次都重新解析（會比較快吃額度，
      // 但至少查詢還能動）。
      return null;
    }
  }

  private async setCached(iata: string, entity: ResolvedSkyscrapperEntity): Promise<void> {
    try {
      await this.redis.set(
        CACHE_KEY_PREFIX + iata,
        JSON.stringify(entity),
        "EX",
        this.env.SKYSCRAPPER_ENTITY_CACHE_TTL_SECONDS,
      );
    } catch {
      // 寫入快取失敗不影響本次查詢結果，只是下次還要再解析一次。
    }
  }

  private async fetchAndParse(iata: string): Promise<ResolvedSkyscrapperEntity> {
    const url = `${this.env.SKYSCRAPPER_API_BASE_URL}/api/v1/flights/searchAirport?query=${encodeURIComponent(iata)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.SKYSCRAPPER_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "x-rapidapi-key": this.env.SKYSCRAPPER_API_KEY,
          "x-rapidapi-host": this.env.SKYSCRAPPER_API_HOST,
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new SkyscrapperTimeoutError(this.env.SKYSCRAPPER_REQUEST_TIMEOUT_MS);
      }
      throw new SkyscrapperNetworkError(`無法連線到 Sky-scrapper API（解析機場 ${iata}）`, err);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429) {
      throw new SkyscrapperRateLimitError(readRetryAfterSeconds(response));
    }

    if (!response.ok) {
      throw new SkyscrapperHttpError(response.status, `解析機場 ${iata} 失敗：${response.statusText}`);
    }

    const parsed = (await response.json()) as RawSkyscrapperAirportSearchResponse;
    const candidates = parsed.data ?? [];

    // skyId/entityId 在 navigation.relevantFlightParams 裡（2026-09 實際 API 回應驗證）。
    // 優先找機場層級（AIRPORT）的完全符合；找不到就退而求其次用城市層級。
    const match =
      candidates.find(
        (c) =>
          c.navigation?.entityType === "AIRPORT" &&
          c.navigation?.relevantFlightParams?.skyId?.toUpperCase() === iata,
      ) ??
      candidates.find((c) => c.navigation?.relevantFlightParams?.skyId?.toUpperCase() === iata);

    if (!match) {
      throw new SkyscrapperEntityResolutionError(iata);
    }

    const skyId = match.navigation!.relevantFlightParams!.skyId!;
    const entityId = match.navigation!.relevantFlightParams!.entityId ?? match.navigation!.entityId;
    if (!entityId) throw new SkyscrapperEntityResolutionError(iata);

    return { skyId, entityId };
  }
}

function readRetryAfterSeconds(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(seconds)) return seconds;
  }
  const resetHeader = response.headers.get("x-ratelimit-requests-reset");
  if (resetHeader) {
    const seconds = Number.parseInt(resetHeader, 10);
    if (!Number.isNaN(seconds)) return seconds;
  }
  return null;
}
