<script setup lang="ts">
import { createDefaultSearchForm } from "~/composables/useReverseSearch";
import type { FlightOffer, ReverseSearchFormState, TripType } from "~/types/reverseSearch";
import { airportName, findAirport, resolveDestination, type Region } from "~/utils/airports";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { loading, error, result, search } = useReverseSearch();
const recent = useRecentSearches();

useHead({ title: () => t("common.nav.flights") });

// ---- 搜尋表單 ↔ 網址參數 ----
function formFromQuery(): ReverseSearchFormState {
  const base = createDefaultSearchForm();
  const q = route.query;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const code = str(q.dest).toUpperCase();
  return {
    ...base,
    destination: code ? `${airportName(code, locale.value)} (${code})` : "",
    dateFrom: str(q.from) || base.dateFrom,
    dateTo: str(q.to) || base.dateTo,
    tripType: (str(q.trip) === "round-trip" ? "round-trip" : "one-way") as TripType,
    returnDateFrom: str(q.rfrom),
    returnDateTo: str(q.rto),
    currency: str(q.cur) || base.currency,
  };
}

const form = ref<ReverseSearchFormState>(formFromQuery());
const destError = ref("");
const searchedCode = ref("");

/** 來回票沒填回程時，預設去程後 5 天。 */
function fillReturnDates(f: ReverseSearchFormState): ReverseSearchFormState {
  if (f.tripType !== "round-trip") return f;
  const plus = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return {
    ...f,
    returnDateFrom: f.returnDateFrom || plus(f.dateTo, 5),
    returnDateTo: f.returnDateTo || plus(f.dateTo, 7),
  };
}

async function runSearch(updateUrl: boolean) {
  const code = resolveDestination(form.value.destination);
  if (!code) {
    destError.value = t("results.destUnknown");
    return;
  }
  destError.value = "";
  form.value = fillReturnDates(form.value);
  searchedCode.value = code;

  if (updateUrl) {
    const f = form.value;
    await router.replace({
      query: {
        dest: code,
        from: f.dateFrom,
        to: f.dateTo,
        cur: f.currency,
        ...(f.tripType === "round-trip" ? { trip: "round-trip", rfrom: f.returnDateFrom, rto: f.returnDateTo } : {}),
      },
    });
  }

  await search({ ...form.value, destination: code });

  if (result.value) {
    recent.add({
      destination: code,
      dateFrom: form.value.dateFrom,
      tripType: form.value.tripType,
      source: result.value.cache.source,
      searchedAt: new Date().toISOString(),
    });
  }
}

onMounted(() => {
  if (route.query.dest) runSearch(false);
});

// ---- 篩選（全部在瀏覽器端做，不另外打 API） ----
type SortKey = "price" | "stops" | "time";
type Slot = "dawn" | "morning" | "afternoon" | "evening";
const sort = ref<SortKey>("price");
const directOnly = ref(false);
const slots = ref<Set<Slot>>(new Set());
const regions = ref<Set<Region>>(new Set());
const filtersOpen = ref(false);

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function hourOf(offer: FlightOffer): number {
  const m = offer.departureAt.match(/T(\d{2})/);
  return m ? Number(m[1]) : 0;
}
function slotOf(offer: FlightOffer): Slot {
  const h = hourOf(offer);
  if (h < 6) return "dawn";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

const filtered = computed<FlightOffer[]>(() => {
  const list = (result.value?.results ?? []).filter((o) => {
    if (directOnly.value && (o.stopovers ?? 0) > 0) return false;
    if (slots.value.size && !slots.value.has(slotOf(o))) return false;
    if (regions.value.size) {
      const region = findAirport(o.origin)?.region;
      if (!region || !regions.value.has(region)) return false;
    }
    return true;
  });
  const sorted = [...list];
  if (sort.value === "price") sorted.sort((a, b) => a.price - b.price);
  if (sort.value === "stops") sorted.sort((a, b) => (a.stopovers ?? 0) - (b.stopovers ?? 0) || a.price - b.price);
  if (sort.value === "time") sorted.sort((a, b) => a.departureAt.localeCompare(b.departureAt));
  return sorted;
});

const cheapestPrice = computed(() => {
  const prices = (result.value?.results ?? []).map((o) => o.price);
  return prices.length ? Math.min(...prices) : null;
});

const activeFilterCount = computed(() => (directOnly.value ? 1 : 0) + slots.value.size + regions.value.size);

function resetFilters() {
  directOnly.value = false;
  slots.value = new Set();
  regions.value = new Set();
  sort.value = "price";
}

const cityLabel = computed(() => {
  const code = searchedCode.value;
  return code ? `${airportName(code, locale.value)}（${code}）` : "";
});

const title = computed(() => {
  if (loading.value) return t("results.titleLoading", { city: cityLabel.value });
  if (result.value) return t("results.title", { city: cityLabel.value, n: result.value.results.length });
  return t("results.titleIdle");
});

const errorMessage = computed(() => {
  if (!error.value || error.value.fieldErrors.length) return "";
  return error.value.status === null ? t("results.backendDown") : error.value.message;
});

const sortOptions: SortKey[] = ["price", "stops", "time"];
const sortLabel: Record<SortKey, string> = { price: "results.sortPrice", stops: "results.sortStops", time: "results.sortTime" };
const slotOptions: Slot[] = ["dawn", "morning", "afternoon", "evening"];
const regionOptions: Region[] = ["asia", "americas", "europe", "oceania"];
</script>

<template>
  <div>
    <section class="top">
      <div class="container top-inner">
        <h1 class="title" aria-live="polite">{{ title }}</h1>
        <SearchForm v-model="form" :loading="loading" :field-errors="error?.fieldErrors ?? []" @submit="runSearch(true)" />
        <p v-if="destError" class="field-error on-coral" role="alert">{{ destError }}</p>
      </div>
    </section>

    <section class="container body">
      <aside class="filters" :class="{ open: filtersOpen }" :aria-label="t('results.filters')">
        <button type="button" class="filters-toggle" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen">
          <span>{{ filtersOpen ? t("results.hideFilters") : t("results.showFilters") }}</span>
          <span v-if="activeFilterCount" class="count">{{ activeFilterCount }}</span>
        </button>
        <div class="filters-body">
          <strong class="display filters-title">{{ t("results.filters") }}</strong>
          <fieldset>
            <legend>{{ t("results.sort") }}</legend>
            <div class="chips">
              <button v-for="s in sortOptions" :key="s" type="button" class="chip" :aria-pressed="sort === s" @click="sort = s">
                {{ t(sortLabel[s]) }}
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>{{ t("results.stops") }}</legend>
            <div class="chips">
              <button type="button" class="chip" :aria-pressed="directOnly" @click="directOnly = !directOnly">
                {{ t("results.directOnly") }}
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>{{ t("results.timeOfDay") }}</legend>
            <div class="chips">
              <button
                v-for="s in slotOptions"
                :key="s"
                type="button"
                class="chip"
                :aria-pressed="slots.has(s)"
                @click="slots = toggle(slots, s)"
              >
                {{ t(`results.${s}`) }}
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>{{ t("results.region") }}</legend>
            <div class="chips">
              <button
                v-for="r in regionOptions"
                :key="r"
                type="button"
                class="chip"
                :aria-pressed="regions.has(r)"
                @click="regions = toggle(regions, r)"
              >
                {{ t(`results.${r}`) }}
              </button>
            </div>
          </fieldset>
          <button v-if="activeFilterCount || sort !== 'price'" type="button" class="btn btn-ghost reset" @click="resetFilters">
            {{ t("results.reset") }}
          </button>
          <IllusTelescope class="telescope" />
        </div>
      </aside>

      <div class="list">
        <p v-if="errorMessage" class="notice notice-error" role="alert">{{ errorMessage }}</p>

        <div v-if="loading" class="loading" aria-busy="true">
          <div v-for="n in 4" :key="n" class="skeleton" />
        </div>

        <template v-else-if="result">
          <CacheNotice :cache="result.cache" />
          <p v-if="result.results.length === 0" class="empty">{{ t("results.empty", { city: cityLabel }) }}</p>
          <p v-else-if="filtered.length === 0" class="empty">{{ t("results.filteredEmpty") }}</p>
          <ResultList v-else :offers="filtered" :cheapest-price="cheapestPrice" :trip-type="form.tripType" />
          <p v-if="result.results.length" class="note">{{ t("results.note") }}</p>
        </template>

        <div v-else-if="!errorMessage" class="idle">
          <IllusConverge class="idle-art" />
          <p>{{ t("results.idle") }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.top {
  background: var(--coral);
  border-bottom: 3px solid var(--ink);
}
.top-inner {
  padding-top: 32px;
  padding-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.title {
  margin: 0;
  font-size: clamp(26px, 3.6vw, 40px);
  font-weight: 900;
  line-height: 1.25;
}
.on-coral {
  color: var(--ink);
  background: var(--cream);
  padding: 6px 12px;
  border-radius: 10px;
  align-self: flex-start;
}
.body {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  align-items: flex-start;
  padding-top: 32px;
  padding-bottom: 40px;
}
.filters {
  flex: 0 1 280px;
  min-width: 0;
  position: sticky;
  top: 96px;
}
.filters-toggle {
  display: none;
}
.filters-body {
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 28px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.filters-title {
  font-size: 20px;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
legend {
  font-weight: 700;
  margin-bottom: 10px;
  padding: 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.reset {
  align-self: flex-start;
  min-height: 36px;
}
.telescope {
  width: 100%;
  max-width: 220px;
  align-self: center;
}
.list {
  flex: 1 1 600px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.empty,
.idle p {
  margin: 0;
  padding: 24px;
  background: var(--white);
  border: 2px dashed var(--ink);
  border-radius: 24px;
  font-weight: 700;
}
.idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}
.idle-art {
  width: 100%;
  max-width: 360px;
  background: var(--coral);
  border: 3px solid var(--ink);
  border-radius: 32px;
}
.note {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
}
.loading {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.skeleton {
  height: 110px;
  border-radius: 26px;
  border: 2px solid rgba(45, 36, 32, 0.2);
  background: linear-gradient(90deg, #f7ebdf 25%, #fff6ec 50%, #f7ebdf 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 900px) {
  .filters {
    position: static;
    flex-basis: 100%;
  }
  .filters-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 52px;
    padding: 0 20px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--white);
    font-weight: 900;
    cursor: pointer;
  }
  .count {
    min-width: 26px;
    height: 26px;
    border-radius: 999px;
    background: var(--coral);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  .filters-body {
    display: none;
    margin-top: 10px;
  }
  .filters.open .filters-body {
    display: flex;
  }
  .filters-title,
  .telescope {
    display: none;
  }
}
</style>
