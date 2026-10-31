<script setup lang="ts">
import type { TravelMode } from "~/composables/useRouteStoryboard";
import { mapMarkerPositions, staticRouteMapUrl, type StoryboardFrame } from "~/utils/storyboard";

const { t, locale } = useI18n();
useHead({ title: () => t("common.nav.routes") });

const { apiKey, loaded } = useGoogleMapsKey();
const { loading, error, frames, routePath, summary, compute } = useRouteStoryboard();

const origin = ref("");
const destination = ref("");
const travelMode = ref<TravelMode>("WALK");
const formError = ref("");
const mapMissing = ref(false);
const resultsEl = ref<HTMLElement | null>(null);
const routeHistory = ref<string[]>([]);
const hideFooterCta = useState("site-footer-hide-cta", () => false);

const LANGUAGE_CODES: Record<string, string> = { zh: "zh-TW", en: "en", ja: "ja", ko: "ko" };
const HISTORY_KEY = "smart-traveler:route-storyboard-history";

function loadRouteHistory() {
  try {
    routeHistory.value = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    routeHistory.value = [];
  }
}

function saveRouteHistory(...values: string[]) {
  const next = [
    ...values.map((v) => v.trim()).filter(Boolean),
    ...routeHistory.value,
  ].filter((value, index, list) => list.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index);
  routeHistory.value = next.slice(0, 12);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(routeHistory.value));
  } catch {
    // 無法寫入時只保留本次頁面狀態。
  }
}

onMounted(loadRouteHistory);
onUnmounted(() => {
  hideFooterCta.value = false;
});
watchEffect(() => {
  hideFooterCta.value = !!summary.value && frames.value.length > 0;
});

async function onSubmit() {
  formError.value = "";
  if (!apiKey.value) {
    formError.value = t("routes.hero.noKey");
    return;
  }
  if (!origin.value.trim() || !destination.value.trim()) {
    formError.value = t("routes.result.needBoth");
    return;
  }
  saveRouteHistory(origin.value, destination.value);
  mapMissing.value = false;
  await compute(
    apiKey.value,
    origin.value.trim(),
    destination.value.trim(),
    travelMode.value,
    LANGUAGE_CODES[locale.value] ?? "zh-TW",
  );
  if (frames.value.length) {
    await nextTick();
    resultsEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

const errorText = computed(() => {
  const e = error.value;
  if (!e) return "";
  if (e.kind === "api") return t("routes.result.errApi", { status: e.status, msg: e.message || "-" });
  if (e.kind === "notFound") return t("routes.result.errNotFound");
  return t("routes.result.errNetwork");
});

function formatDistance(m: number) {
  return m >= 1000
    ? t("routes.result.km", { n: (m / 1000).toFixed(1) })
    : t("routes.result.m", { n: Math.round(m) });
}

function frameTitle(frame: StoryboardFrame) {
  if (frame.kind === "arrive") return t("routes.result.arriveText");
  return frame.instruction || t("routes.result.startText");
}

function frameKind(frame: StoryboardFrame) {
  return t(`routes.result.${frame.kind}`);
}

const staticMapSrc = computed(() =>
  apiKey.value && (routePath.value.length > 0 || frames.value.length > 0)
    ? staticRouteMapUrl(routePath.value, frames.value, apiKey.value)
    : "",
);

const mapMarkers = computed(() => mapMarkerPositions(routePath.value, frames.value));

const pins = computed(() => [
  { text: t("routes.pins.p1"), left: 14.7, top: 87, delay: 0.2 },
  { text: t("routes.pins.p2"), left: 33.8, top: 39.1, delay: 0.5 },
  { text: t("routes.pins.p3"), left: 60.3, top: 65.2, delay: 0.8, hot: true },
  { text: t("routes.pins.p4"), left: 85.3, top: 19.6, delay: 1.1, edge: true },
]);

const ROUTE_PATH = "M700 600 C 700 480 760 400 830 380 S 960 470 1010 500 S 1120 330 1180 290";
</script>

<template>
  <div>
    <!-- 主視覺：首頁 C 的地圖 -->
    <section class="hero">
      <svg class="hero-bg" aria-hidden="true" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice">
        <g fill="#f1e0ce">
          <path d="M90 160 C 160 90, 330 100, 380 170 S 420 330, 330 360 S 140 380, 110 300 S 40 220, 90 160z" />
          <path d="M520 120 C 640 70, 820 90, 860 160 S 830 300, 740 320 S 560 300, 520 240 S 470 160, 520 120z" />
          <path d="M900 200 C 1010 140, 1250 150, 1330 230 S 1360 420, 1230 460 S 1000 450, 940 380 S 860 260, 900 200z" />
          <path d="M620 420 C 700 390, 800 420, 810 500 S 760 620, 690 630 S 590 580, 600 510 S 580 440, 620 420z" />
          <path d="M1120 560 C 1190 530, 1300 550, 1310 610 S 1260 690, 1190 690 S 1090 650, 1100 610z" />
        </g>
        <g fill="#fff" opacity=".7">
          <g class="cloud"><ellipse cx="0" cy="90" rx="60" ry="18" /><ellipse cx="30" cy="78" rx="34" ry="18" /></g>
          <g class="cloud cloud-2"><ellipse cx="0" cy="600" rx="70" ry="20" /><ellipse cx="34" cy="586" rx="38" ry="20" /></g>
        </g>
      </svg>

      <div class="container hero-grid">
        <div class="hero-text">
          <p class="kicker mono">{{ t("routes.hero.kicker") }}</p>
          <h1 class="hero-title">
            <span class="rise-line"><span>{{ t("routes.hero.title1") }}</span></span>
            <span class="rise-line"><span>{{ t("routes.hero.title2") }}</span></span>
          </h1>
          <p class="hero-lead">{{ t("routes.hero.lead") }}</p>

          <p v-if="loaded && !apiKey" class="notice notice-mustard key-notice">
            <span>
              {{ t("routes.hero.noKey") }}
              <NuxtLink to="/settings">{{ t("routes.hero.noKeyLink") }}</NuxtLink>
            </span>
          </p>

          <form class="route-form" novalidate @submit.prevent="onSubmit">
            <label for="r-from" class="sr-only">{{ t("routes.hero.origin") }}</label>
            <input
              id="r-from"
              v-model="origin"
              class="field-input"
              type="text"
              list="route-history"
              autocomplete="street-address"
              :placeholder="t('routes.hero.originPh')"
            />
            <label for="r-to" class="sr-only">{{ t("routes.hero.dest") }}</label>
            <input
              id="r-to"
              v-model="destination"
              class="field-input"
              type="text"
              list="route-history"
              autocomplete="street-address"
              :placeholder="t('routes.hero.destPh')"
            />
            <datalist id="route-history">
              <option v-for="item in routeHistory" :key="item" :value="item" />
            </datalist>
            <div class="form-row">
              <div class="modes" role="group" :aria-label="t('routes.hero.mode')">
                <button type="button" class="chip" :aria-pressed="travelMode === 'WALK'" @click="travelMode = 'WALK'">
                  {{ t("routes.hero.walk") }}
                </button>
                <button type="button" class="chip" :aria-pressed="travelMode === 'DRIVE'" @click="travelMode = 'DRIVE'">
                  {{ t("routes.hero.drive") }}
                </button>
              </div>
              <button type="submit" class="btn btn-coral submit" :disabled="loading">
                {{ loading ? t("routes.hero.computing") : t("routes.hero.submit") }}
              </button>
            </div>
          </form>
          <p v-if="formError" class="field-error" role="alert">
            {{ formError }}
            <NuxtLink v-if="!apiKey" to="/settings">{{ t("routes.hero.noKeyLink") }}</NuxtLink>
          </p>
          <p v-if="errorText" class="notice notice-error" role="alert">{{ errorText }}</p>
        </div>

        <!-- 路線地圖：pin 用百分比定位，跟 SVG 同一個長寬比，任何寬度都對得準 -->
        <div class="route-map" aria-hidden="true">
          <svg viewBox="600 200 680 460" class="route-svg">
            <path :d="ROUTE_PATH" fill="none" stroke="#2D2420" stroke-width="12" stroke-linecap="round" opacity=".12" />
            <path :d="ROUTE_PATH" class="route-line" fill="none" stroke="#e36255" stroke-width="5" stroke-linecap="round" />
            <g fill="#f1e0ce" stroke="#2D2420" stroke-width="3">
              <circle cx="700" cy="600" r="9" />
              <circle cx="830" cy="380" r="9" />
              <circle cx="1010" cy="500" r="9" />
            </g>
            <circle cx="1180" cy="290" r="10" fill="#e36255" class="pulse" />
            <circle cx="1180" cy="290" r="13" fill="#e36255" stroke="#2D2420" stroke-width="3" />
            <g class="walker" :style="{ offsetPath: `path('${ROUTE_PATH}')` }">
              <circle r="11" fill="#f3c262" stroke="#2D2420" stroke-width="3" />
            </g>
          </svg>
          <div
            v-for="pin in pins"
            :key="pin.text"
            class="pin"
            :class="{ 'pin-hot': pin.hot, 'pin-edge': pin.edge }"
            :style="{ left: `${pin.left}%`, top: `${pin.top}%`, animationDelay: `${pin.delay}s` }"
          >
            <span class="pin-body">
              <span class="pin-text">{{ pin.text }}</span>
              <svg width="16" height="10" viewBox="0 0 16 10"><path d="M0 0h16L8 10z" /></svg>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 你的路線（送出後） -->
    <section v-if="summary && frames.length" ref="resultsEl" class="section results">
      <div class="container">
      <div class="head">
        <div class="head-left">
          <SectionLabel en="YOUR ROUTE" :local="t('routes.result.label')" dot="#e36255" />
          <h2 class="h-section">{{ origin }} → {{ destination }}</h2>
        </div>
        <p class="lead head-lead">
          {{
            t("routes.result.summary", {
              dist: formatDistance(summary.distanceMeters),
              min: Math.max(1, Math.round(summary.durationSeconds / 60)),
              n: frames.length,
            })
          }}
        </p>
      </div>
      <div class="results-layout">
        <aside v-if="routePath.length || frames.length" class="route-result-map">
          <div class="map-copy">
            <h3>{{ t("routes.result.mapTitle") }}</h3>
            <p>{{ t("routes.result.mapLead") }}</p>
          </div>
          <div class="result-map-canvas">
            <img
              v-if="staticMapSrc && !mapMissing"
              :src="staticMapSrc"
              :alt="t('routes.result.mapTitle')"
              class="google-map-bg"
              loading="lazy"
              @error="mapMissing = true"
            />
            <div v-else class="map-fallback" aria-hidden="true" />
            <template v-if="staticMapSrc && !mapMissing">
              <span
                v-for="(m, i) in mapMarkers"
                :key="i"
                class="map-marker"
                :style="{ left: `${m.left}%`, top: `${m.top}%` }"
                aria-hidden="true"
              >{{ i + 1 }}</span>
            </template>
          </div>
        </aside>
        <ol class="frames result-frames">
        <li v-for="(frame, i) in frames" :key="i" class="frame lift">
          <div class="photo">
            <StreetViewGuide
              :frame="frame"
              :api-key="apiKey"
              :title="t('routes.result.streetViewFrame', { n: i + 1 })"
            />
            <span class="step-tag display">{{ i + 1 }} · {{ frameKind(frame) }}</span>
          </div>
          <h3>{{ frameTitle(frame) }}</h3>
          <p v-if="frame.distanceAfterMeters > 0" class="frame-desc">
            {{ t("routes.result.then", { dist: formatDistance(frame.distanceAfterMeters) }) }}
          </p>
        </li>
      </ol>
      </div>
      <a href="#r-from" class="more again">{{ t("routes.result.again") }}<span class="more-arrow">↑</span></a>
      </div>
    </section>

    <!-- 示意分鏡 -->
    <section v-else class="container section">
      <div v-reveal class="head">
        <div class="head-left">
          <SectionLabel en="STORYBOARD" :local="t('routes.story.label')" dot="#a2c5c9" />
          <h2 class="h-section">{{ t("routes.story.title") }}</h2>
        </div>
        <p class="lead head-lead">{{ t("routes.story.lead") }}</p>
      </div>
      <p class="sample-note">{{ t("routes.result.sample") }}</p>
      <div class="frames">
        <article v-reveal class="frame lift">
          <div class="photo zoom" style="background: #a2c5c9">
            <svg viewBox="0 0 280 230" aria-hidden="true">
              <rect x="20" y="40" width="70" height="120" fill="#f1e0ce" stroke="#2D2420" stroke-width="3" />
              <rect x="190" y="30" width="70" height="130" fill="#ec9a86" stroke="#2D2420" stroke-width="3" />
              <rect x="40" y="60" width="30" height="24" fill="#fff" stroke="#2D2420" stroke-width="2" />
              <text x="225" y="70" text-anchor="middle" font-weight="900" font-size="18" fill="#2D2420">HOTEL</text>
              <path d="M0 230 L 110 120 H 170 L 280 230z" fill="#5E4E45" stroke="#2D2420" stroke-width="3" />
              <path d="M140 210 V 150" stroke="#f1e0ce" stroke-width="8" stroke-linecap="round" />
              <path d="M126 160 L 140 136 L 154 160z" fill="#f1e0ce" />
            </svg>
            <span class="step-tag display">STEP 1</span>
          </div>
          <h3>{{ t("routes.story.s1Title") }}</h3>
          <p class="frame-desc">{{ t("routes.story.s1Desc") }}</p>
        </article>
        <article v-reveal="0.1" class="frame lift">
          <div class="photo zoom" style="background: #f3c262">
            <svg viewBox="0 0 280 230" aria-hidden="true">
              <rect x="0" y="40" width="280" height="90" fill="#7FA8AD" stroke="#2D2420" stroke-width="3" />
              <rect x="84" y="62" width="112" height="40" rx="6" fill="#f3c262" stroke="#2D2420" stroke-width="3" />
              <text x="140" y="89" text-anchor="middle" font-weight="900" font-size="18" fill="#2D2420">{{ t("routes.story.exit") }}</text>
              <path d="M0 230 L 110 120 H 170 L 280 230z" fill="#5E4E45" stroke="#2D2420" stroke-width="3" />
              <path d="M90 230 L 120 140 H 160 L 190 230" fill="#f1e0ce" stroke="#2D2420" stroke-width="3" />
              <path d="M112 200 h56 M118 176 h44 M124 156 h32" stroke="#2D2420" stroke-width="3" />
            </svg>
            <span class="step-tag display">STEP 2</span>
          </div>
          <h3>{{ t("routes.story.s2Title") }}</h3>
          <p class="frame-desc">{{ t("routes.story.s2Desc") }}</p>
        </article>
        <article v-reveal="0.2" class="frame lift">
          <div class="photo zoom" style="background: #ec9a86">
            <svg viewBox="0 0 280 230" aria-hidden="true">
              <rect x="10" y="50" width="90" height="110" fill="#f1e0ce" stroke="#2D2420" stroke-width="3" />
              <rect x="180" y="40" width="90" height="120" fill="#e36255" stroke="#2D2420" stroke-width="3" />
              <path d="M0 230 L 110 120 H 170 L 280 230z" fill="#5E4E45" stroke="#2D2420" stroke-width="3" />
              <path d="M110 210 h60 M104 192 h72 M98 174 h84" stroke="#fff" stroke-width="6" />
              <g class="turn a-wiggle">
                <path d="M124 140 V 110 H 156" fill="none" stroke="#2D2420" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M152 96 L 172 110 L 152 124z" fill="#2D2420" />
              </g>
            </svg>
            <span class="step-tag display">STEP 3</span>
          </div>
          <h3>{{ t("routes.story.s3Title") }}</h3>
          <p class="frame-desc">{{ t("routes.story.s3Desc") }}</p>
        </article>
        <article v-reveal="0.3" class="frame lift">
          <div class="photo zoom" style="background: #e36255">
            <svg viewBox="0 0 280 230" aria-hidden="true">
              <rect x="60" y="40" width="160" height="130" fill="#f1e0ce" stroke="#2D2420" stroke-width="3" />
              <path d="M50 40 H 230 L 220 70 H 60z" fill="#e36255" stroke="#2D2420" stroke-width="3" />
              <text x="140" y="62" text-anchor="middle" font-weight="900" font-size="18" fill="#f1e0ce">{{ t("routes.story.ramen") }}</text>
              <rect x="116" y="100" width="48" height="70" fill="#2D2420" />
              <circle cx="225" cy="40" r="20" fill="#f3c262" stroke="#2D2420" stroke-width="3" />
              <path d="M216 40 l6 6 l11 -12" fill="none" stroke="#2D2420" stroke-width="3.5" stroke-linecap="round" />
              <path d="M0 230 L 60 170 H 220 L 280 230z" fill="#5E4E45" stroke="#2D2420" stroke-width="3" />
            </svg>
            <span class="step-tag display">STEP 4</span>
          </div>
          <h3>{{ t("routes.story.s4Title") }}</h3>
          <p class="frame-desc">{{ t("routes.story.s4Desc") }}</p>
        </article>
      </div>
    </section>

    <!-- YOUR KEY -->
    <section v-if="!(summary && frames.length)" class="container key-wrap">
      <div v-reveal class="key-box">
        <IllusKeyBrowser class="key-art" />
        <div class="key-text">
          <span class="display key-kicker">{{ t("routes.key.kicker") }}</span>
          <h2>{{ t("routes.key.title") }}</h2>
          <p>{{ t("routes.key.body") }}</p>
        </div>
        <NuxtLink to="/settings" class="btn btn-mustard">{{ t("routes.key.button") }}</NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  background: var(--sage);
  border-bottom: 3px solid var(--ink);
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.cloud {
  animation: cloud 40s linear infinite;
}
.cloud-2 {
  animation-duration: 55s;
  animation-delay: -20s;
}
@keyframes cloud {
  from {
    transform: translateX(-120px);
  }
  to {
    transform: translateX(1500px);
  }
}
.hero-grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 500px) minmax(0, 1fr);
  align-items: center;
  gap: 32px;
  padding-top: clamp(40px, 7vw, 80px);
  padding-bottom: clamp(40px, 7vw, 80px);
  min-height: min(720px, 90vh);
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
  animation: fade-up 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
}
.kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.12em;
  font-size: 14px;
}
.hero-title {
  margin: 0;
  font-size: clamp(40px, 6vw, 66px);
  line-height: 1.12;
  font-weight: 900;
  overflow-wrap: anywhere;
}
.hero-lead {
  margin: 0;
  font-size: clamp(16px, 1.6vw, 18px);
  color: var(--muted);
  max-width: 520px;
}
.key-notice {
  margin: 0;
  font-size: 15px;
}
.key-notice a {
  font-weight: 700;
}
.route-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}
.modes {
  display: flex;
  gap: 8px;
}
.submit {
  min-height: 54px;
  border-radius: 14px;
  padding: 0 26px;
  flex: 1 1 140px;
  max-width: 220px;
}
.submit:disabled {
  opacity: 0.7;
  cursor: progress;
}
.field-error a {
  margin-left: 6px;
}
.notice-error {
  margin: 0;
}

.route-map {
  position: relative;
  aspect-ratio: 680 / 460;
  width: 100%;
}
.route-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.route-line {
  stroke-dasharray: 1000;
  animation: draw 3s ease-out both;
}
@keyframes draw {
  from {
    stroke-dashoffset: 1000;
  }
  to {
    stroke-dashoffset: 0;
  }
}
.pulse {
  animation: pulse 1.8s ease-out infinite;
}
@keyframes pulse {
  0% {
    r: 10;
    opacity: 0.7;
  }
  100% {
    r: 34;
    opacity: 0;
  }
}
.walker {
  animation: walk 6s ease-in-out infinite;
}
@keyframes walk {
  from {
    offset-distance: 0%;
  }
  to {
    offset-distance: 100%;
  }
}
.pin {
  position: absolute;
  animation: drop 0.9s ease-out both;
}
@keyframes drop {
  0% {
    transform: translateY(-40px);
    opacity: 0;
  }
  60% {
    transform: translateY(4px);
    opacity: 1;
  }
  100% {
    transform: none;
    opacity: 1;
  }
}
.pin-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, calc(-100% - 8px));
}
.pin-edge .pin-body {
  transform: translate(-80%, calc(-100% - 8px));
}
.pin-edge .pin-body svg {
  align-self: flex-end;
  margin-right: 12%;
}
.pin-text {
  background: var(--ink);
  color: var(--cream);
  border-radius: 10px;
  padding: 4px 10px;
  font-weight: 700;
  font-size: clamp(12px, 1.2vw, 14px);
  white-space: nowrap;
}
.pin-body svg path {
  fill: var(--ink);
}
.pin-hot .pin-text {
  background: var(--mustard);
  color: var(--ink);
  font-weight: 900;
}
.pin-hot .pin-body svg path {
  fill: var(--mustard);
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
.head-left {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.head-lead {
  max-width: 400px;
}
.sample-note {
  margin: 0 0 24px;
  display: inline-block;
  background: var(--white);
  border: 2px dashed var(--ink);
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 700;
}
.frames {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 22px;
}
.results-layout {
  display: grid;
  grid-template-columns: minmax(360px, 0.95fr) minmax(0, 1.05fr);
  gap: clamp(22px, 4vw, 40px);
  align-items: start;
}
.route-result-map {
  position: sticky;
  top: 92px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 3px solid var(--ink);
  border-radius: 28px;
  background: var(--white);
  padding: clamp(18px, 3vw, 28px);
  max-height: calc(100vh - 116px);
}
.map-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.map-copy h3 {
  margin: 0;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 900;
}
.map-copy p {
  margin: 0;
  color: var(--muted);
}
.result-map-canvas {
  position: relative;
  aspect-ratio: 1 / 1;
  min-height: 0;
  overflow: hidden;
  border: 2px solid var(--ink);
  border-radius: 28px;
  background: var(--cream);
}
.google-map-bg,
.map-fallback {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
.google-map-bg {
  object-fit: contain;
}
.map-fallback {
  background: var(--white);
}
.map-marker {
  position: absolute;
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 4px;
  transform: translate(-50%, -50%);
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: #f3c262;
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}
.result-frames {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 116px);
  overflow-y: auto;
  padding-right: 8px;
  scroll-padding-top: 12px;
}
.frame {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.photo {
  position: relative;
  aspect-ratio: 280 / 165;
  border-radius: 24px;
  border: 3px solid var(--ink);
  overflow: hidden;
  background: var(--sage);
}
.photo > svg,
.photo-link,
.photo img {
  display: block;
  width: 100%;
  height: 100%;
}
.photo-link {
  color: inherit;
  text-decoration: none;
}
.photo img {
  object-fit: cover;
}
.no-photo {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 16px;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
  background: repeating-linear-gradient(45deg, var(--cream), var(--cream) 12px, #ead5c1 12px, #ead5c1 24px);
}
.step-tag {
  position: absolute;
  z-index: 5;
  left: 14px;
  top: 12px;
  font-size: 14px;
  background: var(--cream);
  border: 2px solid var(--ink);
  border-radius: 999px;
  padding: 1px 10px;
}
.turn {
  transform-origin: 140px 110px;
  transform-box: view-box;
}
.frame h3 {
  margin: 0;
  font-size: clamp(19px, 2vw, 22px);
  font-weight: 900;
  overflow-wrap: anywhere;
  transition: color 0.2s ease;
}
.result-frames .frame.lift:hover {
  transform: none;
}
.result-frames .frame:has(.street-view-guide:hover) h3 {
  color: var(--muted-2);
}
.frame-desc {
  margin: 0;
  color: var(--muted);
}
.again {
  margin-top: 32px;
}

.key-wrap {
  padding-bottom: 40px;
}
.key-box {
  background: var(--ink);
  color: var(--cream);
  border-radius: clamp(28px, 4vw, 40px);
  padding: clamp(28px, 5vw, 48px) clamp(22px, 5vw, 56px);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: clamp(20px, 4vw, 40px);
}
.key-art {
  width: clamp(140px, 18vw, 200px);
  flex: none;
}
.key-text {
  flex: 1 1 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.key-kicker {
  letter-spacing: 0.14em;
  color: var(--mustard);
}
.key-text h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 900;
}
.key-text p {
  margin: 0;
  color: var(--on-dark-muted);
}

@media (max-width: 900px) {
  .hero-grid {
    grid-template-columns: 1fr;
    min-height: 0;
    gap: 8px;
  }
  .hero-text {
    max-width: 560px;
  }
  .route-map {
    max-width: 640px;
    margin: 24px auto 0;
  }
}
@media (max-width: 860px) {
  .results-layout {
    display: flex;
    flex-direction: column;
  }
  .route-result-map {
    position: relative;
    top: auto;
    width: 100%;
    max-height: none;
  }
  .result-frames {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
    width: 100%;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }
}
@media (max-width: 480px) {
  .submit {
    max-width: none;
    flex-basis: 100%;
  }
  .modes {
    flex: 1 1 100%;
  }
  .modes .chip {
    flex: 1;
    justify-content: center;
  }
}
</style>
