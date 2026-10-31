<script setup lang="ts">
import { airportName, resolveDestination } from "~/utils/airports";

const { t, locale } = useI18n();
const router = useRouter();
useHead({ title: () => t("common.nav.flights") });

const dest = ref("");
const destError = ref("");

function onSearch() {
  const code = resolveDestination(dest.value);
  if (!code) {
    destError.value = t("results.destUnknown");
    return;
  }
  destError.value = "";
  router.push({ path: "/flights/results", query: { dest: code } });
}

const board = computed(() => [
  { code: "NRT", city: t("cities.TYO"), stop: t("flights.board.direct") },
  { code: "ICN", city: t("cities.SEL"), stop: t("flights.board.direct") },
  { code: "HKG", city: airportName("HKG", locale.value), stop: t("flights.board.direct") },
  { code: "SIN", city: airportName("SIN", locale.value), stop: t("flights.board.oneStop") },
]);

const sample = computed(() => [
  { code: "SIN", detail: `${t("results.direct")} · ${t("common.hm", { h: 4, m: 35 })}`, best: true },
  { code: "HKG", detail: `${t("results.direct")} · ${t("common.hm", { h: 1, m: 35 })}` },
  { code: "NRT", detail: `${t("results.direct")} · ${t("common.hm", { h: 3, m: 50 })}` },
  { code: "BKK", detail: `${t("results.stopsN", { n: 1 })} · ${t("common.hm", { h: 6, m: 10 })}` },
]);
</script>

<template>
  <div>
    <!-- 主視覺：首頁 B 的登機證 -->
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-text">
          <p class="kicker mono">{{ t("flights.hero.kicker") }}</p>
          <h1 class="hero-title">
            <span class="rise-line"><span>{{ t("flights.hero.title1") }}</span></span>
            <span class="rise-line"><span>{{ t("flights.hero.title2") }}</span></span>
          </h1>
          <p class="hero-lead">{{ t("flights.hero.lead") }}</p>
          <form class="hero-form" novalidate @submit.prevent="onSearch">
            <DestinationField
              id="flights-dest"
              v-model="dest"
              class="field-input dest-input"
              :label="t('results.dest')"
              :placeholder="t('flights.hero.placeholder')"
              :aria-invalid="!!destError"
              aria-describedby="flights-dest-error"
            />
            <button type="submit" class="btn btn-ink search-btn">{{ t("flights.hero.submit") }}</button>
          </form>
          <p v-if="destError" id="flights-dest-error" class="field-error dark-error" role="alert">{{ destError }}</p>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="board mono">
            <div class="board-head">
              <span>{{ t("flights.board.title") }}</span>
              <span class="a-blink">● {{ t("flights.board.live") }}</span>
            </div>
            <div class="board-grid">
              <template v-for="(row, i) in board" :key="row.code">
                <span class="flap" :style="{ animationDelay: `${i * 0.6}s` }">{{ row.code }} {{ row.city }}</span>
                <span class="flap" :style="{ animationDelay: `${i * 0.6 + 0.2}s` }">{{ row.stop }}</span>
                <span class="flap price" :style="{ animationDelay: `${i * 0.6 + 0.4}s` }">{{ t("flights.board.pending") }}</span>
              </template>
            </div>
          </div>

          <div class="pass">
            <div class="pass-main">
              <div class="pass-top">
                <span>{{ t("flights.pass.label") }}</span>
                <span class="accent">{{ t("flights.pass.cheapest") }}</span>
              </div>
              <div class="pass-route">
                <span class="iata mono">HKG</span>
                <span class="track">
                  <span class="track-line" />
                  <svg class="plane" width="28" height="28" viewBox="0 0 24 24"><path d="M2 12l20-8-6 16-3-6z" fill="#e36255" stroke="#2D2420" stroke-width="1.4" stroke-linejoin="round" /></svg>
                </span>
                <span class="iata mono">TPE</span>
              </div>
              <div class="pass-meta">
                <div><span>{{ t("flights.pass.date") }}</span><strong>11/05</strong></div>
                <div><span>{{ t("flights.pass.flight") }}</span><strong>{{ t("common.hm", { h: 1, m: 35 }) }}</strong></div>
                <div><span>{{ t("flights.pass.fare") }}</span><strong>{{ t("flights.pass.fareValue") }}</strong></div>
              </div>
            </div>
            <div class="stub">
              <svg width="70" height="90" viewBox="0 0 70 90"><g fill="#2D2420"><rect x="0" width="4" height="90" /><rect x="8" width="2" height="90" /><rect x="14" width="6" height="90" /><rect x="24" width="2" height="90" /><rect x="30" width="4" height="90" /><rect x="38" width="2" height="90" /><rect x="44" width="6" height="90" /><rect x="54" width="2" height="90" /><rect x="60" width="4" height="90" /><rect x="66" width="4" height="90" /></g></svg>
              <span class="mono">SEAT 1A</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how" class="container section">
      <div v-reveal class="head">
        <SectionLabel en="HOW IT WORKS" :local="t('flights.how.label')" dot="#e36255" />
        <h2 class="h-section">{{ t("flights.how.title1") }}<br />{{ t("flights.how.title2") }}</h2>
      </div>
      <div class="steps">
        <svg aria-hidden="true" viewBox="0 0 1232 40" preserveAspectRatio="none" class="steps-line">
          <path d="M60 20 H 1172" stroke="#2D2420" stroke-width="2.5" stroke-dasharray="8 14" fill="none" class="a-dash" />
        </svg>
        <article v-reveal class="step lift">
          <div class="step-top">
            <span class="step-num">01</span>
            <svg class="step-art" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="80" r="62" fill="#a2c5c9" /><ellipse cx="75" cy="128" rx="30" ry="8" fill="#2D2420" opacity=".2" /><g class="a-float" style="animation-duration: 3s"><path d="M75 20 C 50 20 36 38 36 58 C 36 88 75 122 75 122 C 75 122 114 88 114 58 C 114 38 100 20 75 20z" fill="#e36255" stroke="#2D2420" stroke-width="4" /><circle cx="75" cy="58" r="15" fill="#f1e0ce" stroke="#2D2420" stroke-width="4" /></g></svg>
          </div>
          <h3>{{ t("flights.how.s1Title") }}</h3>
          <p>{{ t("flights.how.s1Desc") }}</p>
        </article>
        <article v-reveal="0.12" class="step lift">
          <div class="step-top">
            <span class="step-num">02</span>
            <svg class="step-art" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="80" r="62" fill="#f3c262" /><rect x="22" y="44" width="106" height="74" rx="10" fill="#2D2420" /><g fill="#f1e0ce"><rect x="32" y="56" width="34" height="10" rx="2" /><rect x="32" y="74" width="34" height="10" rx="2" /><rect x="32" y="92" width="34" height="10" rx="2" /></g><g fill="#f3c262"><rect x="86" y="56" width="32" height="10" rx="2" /><rect x="86" y="74" width="32" height="10" rx="2" /><rect x="86" y="92" width="32" height="10" rx="2" /></g></svg>
          </div>
          <h3>{{ t("flights.how.s2Title") }}</h3>
          <p>{{ t("flights.how.s2Desc") }}</p>
        </article>
        <article v-reveal="0.24" class="step lift">
          <div class="step-top">
            <span class="step-num">03</span>
            <svg class="step-art" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="80" r="62" fill="#ec9a86" /><g transform="rotate(-10 75 80)" stroke="#2D2420" stroke-width="4" stroke-linejoin="round"><rect x="20" y="52" width="110" height="58" rx="10" fill="#f1e0ce" /><path d="M100 52 V 110" stroke-dasharray="5 5" fill="none" /><rect x="100" y="52" width="30" height="58" fill="#f3c262" /><path d="M34 72 h46 M34 90 h30" fill="none" stroke-linecap="round" /></g><g transform="translate(118 36)"><circle r="16" fill="#e36255" stroke="#2D2420" stroke-width="3" /><path d="M-7 0 l5 5 l9 -10" fill="none" stroke="#f1e0ce" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" /></g></svg>
          </div>
          <h3>{{ t("flights.how.s3Title") }}</h3>
          <p>{{ t("flights.how.s3Desc") }}</p>
        </article>
      </div>
    </section>

    <!-- 結果預覽 -->
    <section class="preview-wrap">
      <div class="preview container">
        <div v-reveal class="preview-text">
          <SectionLabel en="RESULTS" :local="t('flights.preview.label')" dot="#f3c262" />
          <h2 class="h-section preview-title">{{ t("flights.preview.title1") }}<br />{{ t("flights.preview.title2") }}</h2>
          <p class="lead">{{ t("flights.preview.body") }}</p>
          <div class="chips">
            <span class="chip chip-static is-on">{{ t("flights.preview.chipSort") }}</span>
            <span class="chip chip-static">{{ t("flights.preview.chipDirect") }}</span>
            <span class="chip chip-static">{{ t("flights.preview.chipTrip") }}</span>
          </div>
          <NuxtLink :to="{ path: '/flights/results', query: { dest: 'TPE' } }" class="btn btn-coral try-btn">
            {{ t("flights.preview.try") }} →
          </NuxtLink>
        </div>
        <div class="preview-list">
          <span class="badge sample-badge">{{ t("common.sample") }}</span>
          <div
            v-for="(row, i) in sample"
            :key="row.code"
            v-reveal="i * 0.1"
            class="sample-row lift"
            :class="{ best: row.best }"
          >
            <span class="rank display">{{ i + 1 }}</span>
            <div class="sample-main">
              <strong class="mono">{{ row.code }} → TPE</strong>
              <span>{{ row.detail }}</span>
            </div>
            <span v-if="row.best" class="badge">{{ t("results.cheapest") }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  background: var(--coral);
  border-bottom: 3px solid var(--ink);
}
.hero-grid {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(32px, 5vw, 48px);
  align-items: center;
  padding-top: clamp(32px, 5vw, 48px);
  padding-bottom: clamp(56px, 8vw, 96px);
}
.hero-text {
  flex: 1 1 440px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.hero-title {
  margin: 0;
  font-size: clamp(40px, 6vw, 66px);
  line-height: 1.12;
  font-weight: 900;
}
.hero-lead {
  margin: 0;
  font-size: clamp(16px, 1.6vw, 19px);
  max-width: 480px;
}
.hero-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 540px;
}
.dest-input {
  flex: 1 1 240px;
  background: var(--cream);
  border-radius: 12px;
}
.search-btn {
  border-radius: 12px;
  min-height: 54px;
  color: var(--mustard);
}
.dark-error {
  color: var(--ink);
  background: var(--cream);
  padding: 6px 12px;
  border-radius: 10px;
  align-self: flex-start;
}
.hero-visual {
  flex: 1 1 480px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.board {
  background: var(--ink);
  color: var(--cream);
  border-radius: 16px;
  padding: 20px 22px;
  perspective: 600px;
}
.board-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--mustard);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.1em;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(241, 224, 206, 0.2);
}
.board-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 12px 8px;
  padding-top: 12px;
  font-size: clamp(15px, 1.6vw, 20px);
  font-weight: 600;
}
.flap {
  display: inline-block;
  transform-origin: 50% 50%;
  animation: flip 4s ease-in-out infinite;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.flap.price {
  color: var(--mustard);
}
.pass {
  display: flex;
  background: var(--cream);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(45, 36, 32, 0.25);
}
.pass-main {
  flex: 1;
  min-width: 0;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pass-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.accent {
  color: var(--accent-text);
}
.pass-route {
  display: flex;
  align-items: center;
  gap: 16px;
}
.iata {
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 700;
  line-height: 1;
}
.track {
  flex: 1;
  position: relative;
  height: 28px;
}
.track-line {
  position: absolute;
  top: 13px;
  left: 0;
  right: 0;
  border-top: 2px dashed var(--ink);
  opacity: 0.4;
}
.plane {
  position: absolute;
  top: 0;
  animation: plane 3.5s ease-in-out infinite alternate;
}
@keyframes plane {
  from {
    left: 0%;
  }
  to {
    left: calc(100% - 28px);
  }
}
.pass-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  font-size: 13px;
}
.pass-meta span {
  display: block;
  color: var(--muted-2);
}
.stub {
  width: 120px;
  border-left: 3px dashed var(--ink);
  background: var(--mustard);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  font-weight: 700;
  font-size: 13px;
}

.head {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 44px;
}
.steps {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 24px;
}
.steps-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 100px;
  width: 100%;
  height: 40px;
}
.step {
  position: relative;
  background: var(--white);
  border: 3px solid var(--ink);
  border-radius: 32px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.step-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.step-num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 64px;
  line-height: 1;
  color: var(--coral);
}
.step-art {
  width: 130px;
  height: 130px;
}
.step h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
}
.step p {
  margin: 0;
  color: var(--muted);
  font-size: 17px;
}

.preview-wrap {
  padding: 0 var(--gutter);
}
.preview {
  background: var(--white);
  border-radius: 48px;
  padding-top: clamp(48px, 7vw, 80px);
  padding-bottom: clamp(48px, 7vw, 80px);
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
  align-items: center;
  max-width: 1232px;
}
.preview-text {
  flex: 1 1 340px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0 clamp(0px, 2vw, 16px);
}
.preview-title {
  font-size: clamp(30px, 4vw, 44px);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.try-btn {
  align-self: flex-start;
}
.preview-list {
  position: relative;
  flex: 1 1 480px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 clamp(0px, 2vw, 16px);
}
.sample-badge {
  align-self: flex-end;
}
.sample-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  border: 2px solid var(--ink);
  border-radius: 24px;
  background: var(--cream);
}
.sample-row.best {
  background: var(--mustard);
  border-width: 3px;
  box-shadow: var(--shadow-hard);
}
.rank {
  font-size: 32px;
  width: 32px;
}
.sample-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.sample-main strong {
  font-size: 22px;
}
.sample-main span {
  font-size: 14px;
}

@media (max-width: 760px) {
  .steps-line {
    display: none;
  }
}
@media (max-width: 480px) {
  .stub {
    width: 84px;
    padding: 10px;
  }
  .stub svg {
    width: 50px;
  }
  .pass-main {
    padding: 18px;
  }
  .pass-route {
    gap: 8px;
  }
  .board {
    padding: 16px;
  }
  .search-btn {
    width: 100%;
  }
  .step-art {
    width: 100px;
    height: 100px;
  }
}
</style>
