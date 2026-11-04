export interface SerpApiAccount {
  planName: string | null;
  searchesPerMonth: number | null;
  thisMonthUsage: number | null;
  searchesLeft: number | null;
}

/** 呼叫後端 GET /api/serpapi/account，取得本月剩餘的 SerpApi 搜尋額度（不扣額度）。 */
export function useSerpApiAccount() {
  const { data, error, pending, refresh } = useFetch<SerpApiAccount>("/api/serpapi/account", {
    key: "serpapi-account",
    server: false,
  });
  return { account: data, error, pending, refresh };
}
