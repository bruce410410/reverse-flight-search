const STORAGE_KEY = "smart-traveler:recent-searches";
const MAX_ITEMS = 8;

export interface RecentSearch {
  destination: string;
  dateFrom: string;
  tripType: "one-way" | "round-trip";
  source: string;
  searchedAt: string;
}

/** 「最近的搜尋」只存在使用者自己的瀏覽器，給系統狀態頁顯示快取／額度使用情形。 */
export function useRecentSearches() {
  const items = useState<RecentSearch[]>("recent-searches", () => []);

  function load() {
    try {
      items.value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      items.value = [];
    }
  }

  function add(entry: RecentSearch) {
    load();
    items.value = [entry, ...items.value].slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
    } catch {
      // 寫不進去就只保留在記憶體。
    }
  }

  return { items, load, add };
}
