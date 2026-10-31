<script setup lang="ts">
import { resolveDestination } from "~/utils/airports";

const { t, tm } = useI18n();
const router = useRouter();

useHead({ title: "" });

const dest = ref("");
const destError = ref("");

const popular = [
  { key: "TYO", dest: "NRT" },
  { key: "SEL", dest: "ICN" },
  { key: "BKK", dest: "BKK" },
  { key: "LON", dest: "LHR" },
];

function onSearch() {
  const code = resolveDestination(dest.value);
  if (!code) {
    destError.value = t("results.destUnknown");
    return;
  }
  destError.value = "";
  router.push({ path: "/flights/results", query: { dest: code } });
}

const words = computed(() => tm<string[]>("home.hero.words"));
</script>

<template>
  <div>
    <!-- 主視覺：首頁 E 的大標題＋漂浮色球 -->
    <section class="hero">
      <div class="balls" aria-hidden="true">
        <span class="ball b1 a-float" />
        <span class="ball b2 a-drift" />
        <span class="ball b3 a-float" />
        <span class="ball b4 a-drift" />
      </div>
      <div class="container hero-grid">
        <h1 class="hero-title">
          <span class="rise-line"><span>{{ t("home.hero.line1") }}</span></span>
          <span class="words" aria-live="off">
            <span class="words-track">
              <span v-for="w in words" :key="w">{{ w }}</span>
            </span>
          </span>
          <span class="rise-line"><span>{{ t("home.hero.line3") }}</span></span>
        </h1>
        <div class="hero-side">
          <p class="lead">{{ t("home.hero.lead") }}</p>
          <form class="pill-form" novalidate @submit.prevent="onSearch">
            <DestinationField
              id="home-dest"
              v-model="dest"
              :label="t('home.hero.destLabel')"
              :placeholder="t('home.hero.placeholder')"
              :aria-invalid="!!destError"
              aria-describedby="home-dest-error"
            />
            <button type="submit" class="btn btn-ink">{{ t("home.hero.submit") }}</button>
          </form>
          <p v-if="destError" id="home-dest-error" class="field-error" role="alert">{{ destError }}</p>
          <div class="popular">
            <span class="popular-label">{{ t("home.hero.popular") }}</span>
            <NuxtLink
              v-for="p in popular"
              :key="p.key"
              :to="{ path: '/flights/results', query: { dest: p.dest } }"
              class="chip"
            >
              {{ t(`cities.${p.key}`) }}
            </NuxtLink>
          </div>
        </div>
      </div>
      <CityCarousel />
    </section>

    <!-- ABOUT -->
    <section class="container section about">
      <div v-reveal class="about-text">
        <SectionLabel en="ABOUT" :local="t('home.about.label')" dot="#e36255" />
        <h2 class="h-section">
          {{ t("home.about.title1") }}<br />{{ t("home.about.title2Pre")
          }}<span class="hl">{{ t("home.about.highlight") }}</span>{{ t("home.about.title2Post") }}
        </h2>
        <p class="lead">{{ t("home.about.body") }}</p>
        <NuxtLink to="/flights#how" class="more">
          {{ t("home.about.more") }}<span class="more-arrow" aria-hidden="true">→</span>
        </NuxtLink>
      </div>
      <div v-reveal="0.15" class="about-art">
        <IllusSuitcase />
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features">
      <div class="container">
        <div v-reveal class="features-head">
          <div class="stack-14">
            <SectionLabel en="FEATURES" :local="t('home.features.label')" dot="#a2c5c9" />
            <h2 class="h-section">{{ t("home.features.title1") }}<br />{{ t("home.features.title2") }}</h2>
          </div>
          <p class="lead features-lead">{{ t("home.features.lead") }}</p>
        </div>

        <div class="feature-grid">
          <article v-reveal class="feature lift">
            <div class="feature-art zoom" style="background: #e36255">
              <IllusConverge />
              <span class="num-pill pos-tl">01 / 03</span>
            </div>
            <h3>{{ t("home.features.flightsTitle") }}</h3>
            <p>{{ t("home.features.flightsDesc") }}</p>
            <NuxtLink to="/flights" class="more">
              {{ t("home.features.flightsMore") }}<span class="more-arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </article>

          <article v-reveal="0.12" class="feature lift">
            <div class="feature-art zoom" style="background: #a2c5c9">
              <IllusStreetStack />
              <span class="num-pill pos-tl">02 / 03</span>
            </div>
            <h3>{{ t("home.features.routesTitle") }}</h3>
            <p>{{ t("home.features.routesDesc") }}</p>
            <NuxtLink to="/route-storyboard" class="more">
              {{ t("home.features.routesMore") }}<span class="more-arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </article>

          <article v-reveal="0.24" class="feature lift">
            <div class="feature-art zoom" style="background: #f3c262">
              <IllusRoomPlan />
              <span class="num-pill pos-tl">03 / 03</span>
              <span class="badge pos-tr">{{ t("common.comingSoon") }}</span>
            </div>
            <h3>{{ t("home.features.roomsTitle") }}</h3>
            <p>{{ t("home.features.roomsDesc") }}</p>
            <NuxtLink to="/rooms#waitlist" class="more">
              {{ t("home.features.roomsMore") }}<span class="more-arrow" aria-hidden="true">→</span>
            </NuxtLink>
          </article>
        </div>
      </div>
    </section>

    <!-- WHY：大數字 -->
    <section class="why">
      <div class="container stack-48">
        <SectionLabel v-reveal en="WHY" :local="t('home.why.label')" dot="#f3c262" dark />
        <div class="why-grid">
          <div v-reveal class="why-item">
            <span class="why-num" style="color: #e36255">14</span>
            <strong>{{ t("home.why.w1Title") }}</strong>
            <span>{{ t("home.why.w1Desc") }}</span>
          </div>
          <div v-reveal="0.1" class="why-item">
            <span class="why-num" style="color: #a2c5c9">1<small>{{ t("home.why.w2Unit") }}</small></span>
            <strong>{{ t("home.why.w2Title") }}</strong>
            <span>{{ t("home.why.w2Desc") }}</span>
          </div>
          <div v-reveal="0.2" class="why-item">
            <span class="why-num" style="color: #f3c262">4</span>
            <strong>{{ t("home.why.w3Title") }}</strong>
            <span>{{ t("home.why.w3Desc") }}</span>
          </div>
          <div v-reveal="0.3" class="why-item">
            <span class="why-num" style="color: #ec9a86">0</span>
            <strong>{{ t("home.why.w4Title") }}</strong>
            <span>{{ t("home.why.w4Desc") }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 跑馬燈 -->
    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        <template v-for="n in 2" :key="n">
          <span>出發</span><span class="dot c">●</span><span>DEPART</span><span class="dot w">●</span>
          <span>出発</span><span class="dot c">●</span><span>출발</span><span class="dot w">●</span>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
}
.balls {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.ball {
  position: absolute;
  border-radius: 50%;
}
.b1 {
  right: 7%;
  top: 30px;
  width: clamp(60px, 9vw, 120px);
  height: clamp(60px, 9vw, 120px);
  background: var(--mustard);
}
.b2 {
  right: 22%;
  top: 150px;
  width: 46px;
  height: 46px;
  background: var(--sage);
}
.b3 {
  right: 3%;
  top: 230px;
  width: 26px;
  height: 26px;
  border: 3px solid var(--ink);
}
.b4 {
  left: 46%;
  top: 24px;
  width: 18px;
  height: 18px;
  background: var(--coral);
}
.hero-grid {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  align-items: flex-end;
  padding-top: clamp(32px, 5vw, 56px);
  padding-bottom: 32px;
}
.hero-title {
  flex: 1 1 560px;
  min-width: 0;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(56px, 9.5vw, 120px);
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.words {
  display: block;
  height: 1.05em;
  line-height: 1.05em;
  overflow: hidden;
  color: var(--coral);
}
.words-track {
  display: block;
  animation: words 10s cubic-bezier(0.7, 0, 0.3, 1) 1s infinite;
}
.words-track > span {
  display: block;
  height: 1.05em;
  white-space: nowrap;
}
.hero-side {
  flex: 1 1 360px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 14px;
}
.popular {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.popular-label {
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}
.about {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(32px, 6vw, 64px);
  align-items: center;
}
.about-text {
  flex: 1 1 440px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.about-art {
  flex: 1 1 400px;
  min-width: 0;
  display: flex;
  justify-content: center;
}
.about-art :deep(.illus) {
  width: 100%;
  max-width: 540px;
}
.hl {
  background: linear-gradient(transparent 60%, var(--mustard) 60%);
}

.features {
  background: var(--white);
  border-radius: 48px 48px 0 0;
  padding: clamp(64px, 9vw, 96px) 0 clamp(72px, 9vw, 110px);
}
.features-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 48px;
}
.features-lead {
  max-width: 380px;
}
.stack-14 {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stack-48 {
  display: flex;
  flex-direction: column;
  gap: 48px;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 24px;
}
.feature {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.feature h3 {
  margin: 4px 0 0;
  font-size: 28px;
  font-weight: 900;
}
.feature p {
  margin: 0;
  font-size: 17px;
  color: var(--muted);
}
.feature-art {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 32px;
  border: 3px solid var(--ink);
}
.feature-art :deep(.illus) {
  display: block;
  width: 100%;
  height: 100%;
}
.pos-tl {
  position: absolute;
  left: 18px;
  top: 16px;
}
.pos-tr {
  position: absolute;
  right: 18px;
  top: 18px;
}

.why {
  background: var(--ink);
  color: var(--cream);
  padding: clamp(64px, 9vw, 96px) 0;
}
.why-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
}
.why-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 28px;
  border-left: 1px solid rgba(241, 224, 206, 0.2);
}
.why-item:first-child {
  border-left: 0;
  padding-left: 0;
}
.why-item span:last-child {
  color: var(--on-dark-muted);
}
.why-item strong {
  font-size: 20px;
}
.why-num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(72px, 9vw, 104px);
  line-height: 1;
}
.why-num small {
  font-size: 0.46em;
}

.marquee {
  border-bottom: 2px solid var(--ink);
  padding: 22px 0;
  overflow: hidden;
  white-space: nowrap;
  background: var(--mustard);
}
.marquee-track {
  display: inline-flex;
  gap: 40px;
  padding-left: 40px;
  animation: marquee 26s linear infinite;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(32px, 4vw, 48px);
}
.dot.c {
  color: var(--coral);
}
.dot.w {
  color: var(--white);
}

@media (max-width: 760px) {
  .why-item {
    border-left: 0;
    border-top: 1px solid rgba(241, 224, 206, 0.2);
    padding: 20px 0;
  }
  .why-item:first-child {
    border-top: 0;
  }
  .b2,
  .b3 {
    display: none;
  }
}
@media (max-width: 480px) {
  .hero-side :deep(.pill-form input) {
    padding: 0 12px;
  }
}
</style>
