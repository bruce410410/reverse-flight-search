import type { Redis } from "ioredis";

export interface CacheEntry<T> {
  data: T;
  /** 寫入快取的時間（epoch ms） */
  cachedAtMs: number;
}

/**
 * 通用的 JSON 快取存取層，建立在 Redis 之上。
 *
 * 刻意不在這裡做任何「鮮度分級」的判斷——分級邏輯屬於業務層
 * （見 cache/freshness.ts），這裡只負責老實地存與取，並保留 cachedAtMs
 * 讓上層可以自行計算年齡。
 *
 * TTL 統一設為略大於「捨棄」門檻（48h），讓 Redis 自動清掉早就該捨棄的資料，
 * 避免快取無限增長；即使 TTL 還沒到，業務層的鮮度判斷本來就會在 >48h 時拒用它。
 */
export class CacheStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 60 * 60 * 50, // 50h，略大於 48h 捨棄門檻
  ) {}

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (typeof parsed.cachedAtMs !== "number" || parsed.data === undefined) {
        // 資料格式不符合預期（例如上一版格式遺留），視為快取不存在，
        // 讓呼叫端走正常的 cache-miss 流程，而不是丟例外中斷請求。
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, cachedAtMs: number = Date.now()): Promise<void> {
    const entry: CacheEntry<T> = { data, cachedAtMs };
    await this.redis.set(key, JSON.stringify(entry), "EX", this.ttlSeconds);
  }
}

/**
 * 產生反向搜票查詢的快取鍵。
 * 鍵包含所有會影響查詢結果的參數，確保不同查詢條件不會互相汙染快取。
 */
export function buildReverseSearchCacheKey(params: {
  destination: string;
  dateFrom: string;
  dateTo: string;
  tripType: string;
  returnDateFrom?: string;
  returnDateTo?: string;
  currency: string;
}): string {
  const parts = [
    "reverse-search",
    params.destination.toUpperCase(),
    params.dateFrom,
    params.dateTo,
    params.tripType,
    params.returnDateFrom ?? "-",
    params.returnDateTo ?? "-",
    params.currency.toUpperCase(),
  ];
  return parts.join(":");
}
