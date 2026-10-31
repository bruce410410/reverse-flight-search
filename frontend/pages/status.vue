<script setup lang="ts">
const { t, locale } = useI18n();
useHead({ title: () => t("status.label") });

const { health, error: healthError, pending: healthPending, refresh: refreshHealth } = useBackendHealth();
const { account, error: accountError, pending: accountPending, refresh: refreshAccount } = useSerpApiAccount();
const { apiKey } = useGoogleMapsKey();
const { items: recent, load: loadRecent } = useRecentSearches();

const checkedAt = ref<Date | null>(null);
const refreshing = ref(false);

onMounted(() => {
  loadRecent();
  checkedAt.value = new Date();
});

async function onRefresh() {
  refreshing.value = true;
  await Promise.all([refreshHealth(), refreshAccount()]);
  loadRecent();
  checkedAt.value = new Date();
  refreshing.value = false;
}

type State = "ok" | "bad" | "checking" | "key";
const serpState = computed<State>(() => {
  if (accountPending.value && !account.value) return "checking";
  if (accountError.value || !account.value) return "bad";
  return "ok";
});
const cacheState = computed<State>(() => {
  if (healthPending.value && !health.value) return "checking";
  if (healthError.value || !health.value?.redis?.connected) return "bad";
  return "ok";
});
const keyState = computed<State>(() => (apiKey.value ? "ok" : "key"));
const overall = computed<"ok" | "bad" | "checking">(() => {
  const states = [serpState.value, cacheState.value];
  if (states.includes("checking")) return "checking";
  return states.includes("bad") ? "bad" : "ok";
});
const backendDown = computed(() => !!healthError.value && !healthError.value.statusCode);

function stateText(s: State, keyed = false) {
  if (keyed) return s === "ok" ? t("status.keySet") : t("status.keyUnset");
  return t(`status.${s}`);
}

const services = computed(() => [
  {
    id: "serp",
    name: t("status.serp"),
    desc: t("status.serpDesc"),
    state: serpState.value,
    text: stateText(serpState.value),
    color: "#e36255",
    icon: "M2 16l20-6-20-6 4 6z",
    extra: accountError.value ? (accountError.value.data as { message?: string } | undefined)?.message : undefined,
  },
  {
    id: "routes",
    name: t("status.routes"),
    desc: t("status.routesDesc"),
    state: keyState.value,
    text: stateText(keyState.value, true),
    color: "#a2c5c9",
    icon: "M5 20 V 9 H 16 M13 5 l4 4 l-4 4",
    link: true,
  },
  {
    id: "sv",
    name: t("status.sv"),
    desc: t("status.svDesc"),
    state: keyState.value,
    text: stateText(keyState.value, true),
    color: "#ec9a86",
    icon: "M3 7 a2 2 0 0 1 2 -2 h14 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 h-14 a2 2 0 0 1 -2 -2z M3 16 l6 -6 l5 5 l3 -3 l4 4",
    link: true,
  },
  {
    id: "cache",
    name: t("status.cache"),
    desc: t("status.cacheDesc"),
    state: cacheState.value,
    text: stateText(cacheState.value),
    color: "#f3c262",
    icon: "M4 6 a8 3 0 1 0 16 0 a8 3 0 1 0 -16 0 M4 6 v6 c0 1.7 3.6 3 8 3 s8 -1.3 8 -3 V6 M4 12 v6 c0 1.7 3.6 3 8 3 s8 -1.3 8 -3 v-6",
    extra: health.value?.redis?.connected ? t("status.latency", { ms: health.value.redis.latencyMs }) : undefined,
  },
]);

const quotaPct = computed(() => {
  const a = account.value;
  if (!a?.searchesPerMonth || a.searchesLeft == null) return 0;
  return Math.max(0, Math.min(100, (a.searchesLeft / a.searchesPerMonth) * 100));
});

function shortDate(iso: string) {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[1]}/${m[2]}` : iso;
}

const checkedText = computed(() =>
  checkedAt.value
    ? t("status.checkedAt", {
        t: checkedAt.value.toLocaleTimeString(locale.value === "zh" ? "zh-TW" : locale.value, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      })
    : "",
);
</script>

<template>
  <div>
    <section class="container hero">
      <div class="hero-text">
        <SectionLabel en="STATUS" :local="t('status.label')" dot="#a2c5c9" />
        <h1 class="hero-title display" aria-live="polite">
          <span class="rise-line"><span>{{ t(`status.${overall}Title1`) }}</span></span>
          <span class="rise-line"><span class="coral">{{ t(`status.${overall}Title2`) }}</span></span>
        </h1>
        <p class="lead">{{ t("status.lead") }}</p>
        <div class="refresh-row">
          <button type="button" class="btn btn-ink" :disabled="refreshing" @click="onRefresh">
            <span :class="{ 'a-spin': refreshing }" aria-hidden="true">↻</span>
            {{ t("status.refresh") }}
          </button>
          <ClientOnly><span class="checked mono">{{ checkedText }}</span></ClientOnly>
        </div>
        <p v-if="backendDown" class="notice notice-error" role="alert">{{ t("status.backendDown") }}</p>
      </div>
      <div v-reveal class="hero-art">
        <IllusTower />
      </div>
    </section>

    <section class="container services">
      <article v-for="(s, i) in services" :key="s.id" v-reveal="i * 0.08" class="service lift">
        <div class="service-top">
          <span class="service-icon" :style="{ background: s.color }">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D2420" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path :d="s.icon" /></svg>
          </span>
          <span class="state" :class="`state-${s.state}`"><span class="state-dot" />{{ s.text }}</span>
        </div>
        <h2>{{ s.name }}</h2>
        <span class="muted">{{ s.desc }}</span>
        <span v-if="s.extra" class="extra mono">{{ s.extra }}</span>
        <NuxtLink v-if="s.link && s.state !== 'ok'" to="/settings" class="more set-key">
          {{ t("status.setKey") }}<span class="more-arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </article>
    </section>

    <section class="container bottom">
      <div v-reveal class="quota">
        <div class="quota-head">
          <h2>{{ t("status.quotaTitle") }}</h2>
          <span class="display mustard">SERPAPI</span>
        </div>
        <template v-if="account && account.searchesLeft != null">
          <p class="quota-num">
            <span class="display big">{{ account.searchesLeft }}</span>
            <span v-if="account.searchesPerMonth" class="of">{{ t("status.quotaOf", { n: account.searchesPerMonth }) }}</span>
          </p>
          <div
            class="bar"
            role="progressbar"
            :aria-valuenow="account.searchesLeft"
            aria-valuemin="0"
            :aria-valuemax="account.searchesPerMonth ?? undefined"
            :aria-label="t('status.quotaTitle')"
          >
            <div class="bar-fill" :style="{ width: `${quotaPct}%` }" />
          </div>
          <span v-if="account.planName" class="soft">{{ t("status.plan", { name: account.planName }) }}</span>
        </template>
        <p v-else class="quota-num">
          <span class="display unknown">{{ accountPending ? t("status.checking") : t("status.quotaUnknown") }}</span>
        </p>
        <span class="soft">{{ t("status.quotaNote") }}</span>
      </div>

      <div v-reveal="0.1" class="recent">
        <h2>{{ t("status.recentTitle") }}</h2>
        <ClientOnly>
          <ul v-if="recent.length" class="recent-list">
            <li v-for="r in recent" :key="r.searchedAt">
              <NuxtLink :to="{ path: '/flights/results', query: { dest: r.destination } }" class="mono recent-link">
                → {{ r.destination }} · {{ shortDate(r.dateFrom) }}
              </NuxtLink>
              <span class="recent-src" :class="r.source.startsWith('cache') ? 'cached' : 'live'">
                {{ r.source.startsWith("cache") ? t("status.recentCached") : t("status.recentLive") }}
              </span>
            </li>
          </ul>
          <p v-else class="muted">{{ t("status.recentEmpty") }}</p>
        </ClientOnly>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding-top: clamp(40px, 6vw, 56px);
  padding-bottom: 40px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 40px;
  align-items: center;
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.hero-title {
  margin: 0;
  font-size: clamp(40px, 6.6vw, 80px);
  line-height: 1.04;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}
.coral {
  color: var(--coral);
}
.refresh-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}
.checked {
  font-size: 14px;
  color: var(--muted);
}
.notice-error {
  margin: 0;
}
.hero-art {
  display: flex;
  justify-content: center;
}
.hero-art :deep(svg) {
  width: 100%;
  max-width: 440px;
}

.services {
  padding-bottom: 40px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 20px;
}
.service {
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 28px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.service-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.service-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  border: 2px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.state {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  font-size: 14px;
  text-align: right;
}
.state-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
}
.state-ok .state-dot {
  background: var(--ok);
  box-shadow: 0 0 0 4px #2f8f5b55;
}
.state-bad .state-dot {
  background: var(--coral);
  box-shadow: 0 0 0 4px #e3625555;
}
.state-bad {
  color: var(--accent-text);
}
.state-key .state-dot {
  background: var(--mustard);
  box-shadow: 0 0 0 4px #f3c26255;
}
.state-checking .state-dot {
  background: var(--sage);
  animation: blink 1.2s steps(2) infinite;
}
.service h2 {
  margin: 0;
  font-size: 20px;
}
.muted {
  color: var(--muted);
}
.extra {
  font-size: 13px;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.set-key {
  margin-top: auto;
  font-size: 15px;
}

.bottom {
  padding-bottom: clamp(48px, 7vw, 80px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 20px;
}
.quota {
  background: var(--ink);
  color: var(--cream);
  border-radius: var(--radius-lg);
  padding: clamp(22px, 3.4vw, 32px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.quota-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.quota-head h2,
.recent h2 {
  margin: 0;
  font-size: 22px;
}
.mustard {
  color: var(--mustard);
}
.quota-num {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}
.big {
  font-size: clamp(56px, 7vw, 80px);
  line-height: 1;
  color: var(--mustard);
}
.unknown {
  font-size: clamp(28px, 3.4vw, 36px);
  color: var(--mustard);
}
.of {
  font-size: 20px;
  color: var(--on-dark-muted);
}
.bar {
  height: 18px;
  border-radius: 999px;
  background: rgba(241, 224, 206, 0.15);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--coral), var(--mustard));
  transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.soft {
  color: var(--on-dark-muted);
}
.recent {
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: var(--radius-lg);
  padding: clamp(22px, 3.4vw, 32px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.recent-list li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.recent-list li:last-child {
  border-bottom: 0;
}
.recent-link {
  font-weight: 700;
  text-decoration: none;
}
.recent-src {
  font-size: 14px;
  font-weight: 900;
}
.cached {
  color: var(--ok);
}
.live {
  color: var(--accent-text);
}
@keyframes blink {
  50% {
    opacity: 0.25;
  }
}
@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .hero-art :deep(svg) {
    max-width: 320px;
  }
}
</style>
