export interface BackendHealth {
  status: "ok" | "degraded";
  timestamp: string;
  redis: {
    state: string;
    connected: boolean;
    latencyMs: number;
    error?: string;
  };
}

/**
 * 呼叫後端 /api/health，回報系統（含 Redis 快取層）的即時狀態。
 * 之後反向搜票的搜尋頁可以重用這個 composable，在使用者送出查詢前
 * 先確認快取層是否健康，決定要不要提示「目前資料可能較不即時」。
 */
export function useBackendHealth() {

  const {
    data: health,
    error,
    pending,
    refresh,
  } = useFetch<BackendHealth>("/api/health", {
    // 健康狀態不快取 payload，每次呼叫都要拿到最新結果。
    key: "backend-health",
  });

  return { health, error, pending, refresh };
}
