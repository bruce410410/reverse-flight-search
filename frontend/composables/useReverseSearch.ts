import type { ApiErrorBody, ReverseSearchFormState, ReverseSearchResult } from "~/types/reverseSearch";

export interface ReverseSearchError {
  status: number | null;
  message: string;
  fieldErrors: { path: string; message: string }[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createDefaultSearchForm(): ReverseSearchFormState {
  const dateFrom = addDaysIso(todayIso(), 14);
  return {
    destination: "",
    dateFrom,
    dateTo: addDaysIso(dateFrom, 5),
    tripType: "one-way",
    returnDateFrom: "",
    returnDateTo: "",
    currency: "TWD",
    maxResults: 20,
  };
}

/**
 * 呼叫後端 POST /api/reverse-search 的 composable。
 *
 * 刻意不在這裡重複後端已經做過的完整驗證邏輯（日期範圍、round-trip 規則等）——
 * 表單元件只做「基本的、能立刻給使用者回饋」的檢查（必填、格式），
 * 真正的業務規則驗證交給後端，前端顯示後端回傳的逐欄位錯誤訊息即可，
 * 避免兩邊規則不同步時互相矛盾。
 */
export function useReverseSearch() {

  const loading = ref(false);
  const error = ref<ReverseSearchError | null>(null);
  const result = ref<ReverseSearchResult | null>(null);

  async function search(form: ReverseSearchFormState): Promise<void> {
    loading.value = true;
    error.value = null;

    const payload: Record<string, unknown> = {
      destination: form.destination.trim().toUpperCase(),
      dateFrom: form.dateFrom,
      dateTo: form.dateTo,
      tripType: form.tripType,
      currency: form.currency.trim().toUpperCase() || "TWD",
      maxResults: form.maxResults,
    };
    if (form.tripType === "round-trip") {
      payload.returnDateFrom = form.returnDateFrom;
      payload.returnDateTo = form.returnDateTo;
    }

    try {
      const data = await $fetch<ReverseSearchResult>("/api/reverse-search", {
        method: "POST",
        body: payload,
      });
      result.value = data;
    } catch (err: unknown) {
      result.value = null;
      error.value = normalizeError(err);
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, result, search };
}

function normalizeError(err: unknown): ReverseSearchError {
  // $fetch 在非 2xx 時會拋出 FetchError，其 `data` 欄位帶有伺服器回傳的 JSON body。
  const fetchErr = err as { statusCode?: number; data?: ApiErrorBody; message?: string };

  if (fetchErr?.data?.message) {
    return {
      status: fetchErr.statusCode ?? null,
      message: fetchErr.data.message,
      fieldErrors: fetchErr.data.details ?? [],
    };
  }

  return {
    status: fetchErr?.statusCode ?? null,
    message: fetchErr?.message ?? "無法連線到伺服器，請稍後再試",
    fieldErrors: [],
  };
}
