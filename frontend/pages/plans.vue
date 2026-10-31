<script setup lang="ts">
const { t, tm } = useI18n();
useHead({ title: () => t("common.nav.plans") });

const freeFeatures = computed(() => [t("plans.freeF1"), t("plans.freeF2"), t("plans.freeF3")]);
const proFeatures = computed(() => [t("plans.proF1"), t("plans.proF2"), t("plans.proF3"), t("plans.proF4")]);
const rows = computed(() => tm("plans.rows") as unknown as string[][]);
const faqs = computed(() => [
  { q: t("plans.q1"), a: t("plans.a1") },
  { q: t("plans.q2"), a: t("plans.a2") },
  { q: t("plans.q3"), a: t("plans.a3") },
]);
</script>

<template>
  <div>
    <section class="container hero">
      <span class="deco d1 a-float" aria-hidden="true" />
      <span class="deco d2 a-drift" aria-hidden="true" />
      <span class="deco d3" aria-hidden="true" />
      <SectionLabel en="PLANS" :local="t('plans.label')" dot="#e36255" class="hero-label" />
      <h1 class="hero-title display">
        <span class="rise-line"><span>{{ t("plans.title1") }}</span></span>
        <span class="rise-line"><span class="coral">{{ t("plans.title2") }}</span></span>
      </h1>
      <p class="lead hero-lead">{{ t("plans.lead") }}</p>
    </section>

    <section class="container-narrow plans">
      <article v-reveal class="plan plan-free lift">
        <svg class="plan-deco" aria-hidden="true" viewBox="0 0 160 160"><circle cx="80" cy="80" r="70" fill="#a2c5c9" /><g transform="rotate(-12 80 80)" stroke="#2D2420" stroke-width="4"><rect x="40" y="56" width="80" height="50" rx="8" fill="#f1e0ce" /><path d="M98 56 V 106" stroke-dasharray="4 4" /></g></svg>
        <h2 class="plan-name display">{{ t("plans.freeName") }}</h2>
        <p class="price-row"><span class="price display">0</span><span class="per">{{ t("plans.perMonth") }}</span></p>
        <p class="plan-desc muted">{{ t("plans.freeDesc") }}</p>
        <ul class="features">
          <li v-for="f in freeFeatures" :key="f">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="#2D2420" /><path d="M6 11 l3.5 3.5 L16 8" fill="none" stroke="#f1e0ce" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span>{{ f }}</span>
          </li>
        </ul>
        <div class="plan-cta"><NuxtLink to="/flights" class="btn btn-white">{{ t("plans.freeCta") }}</NuxtLink></div>
      </article>

      <article v-reveal="0.12" class="plan plan-pro lift">
        <svg class="badge-spin a-spin" aria-hidden="true" viewBox="0 0 200 200">
          <defs><path id="pl-c" d="M100 100 m -70 0 a 70 70 0 1 1 140 0 a 70 70 0 1 1 -140 0" /></defs>
          <circle cx="100" cy="100" r="54" fill="#f3c262" stroke="#2D2420" stroke-width="4" />
          <text font-size="15" font-weight="800" fill="#2D2420"><textPath href="#pl-c" textLength="432" lengthAdjust="spacingAndGlyphs">{{ t("plans.proBadge") }}</textPath></text>
        </svg>
        <h2 class="plan-name display">{{ t("plans.proName") }}</h2>
        <p class="price-row"><span class="price price-soon display">{{ t("plans.proPrice") }}</span></p>
        <p class="plan-desc">{{ t("plans.proDesc") }}</p>
        <ul class="features">
          <li v-for="f in proFeatures" :key="f">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="#2D2420" /><path d="M6 11 l3.5 3.5 L16 8" fill="none" stroke="#f1e0ce" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <span>{{ f }}</span>
          </li>
        </ul>
        <div class="plan-cta"><a href="#premium-waitlist" class="btn btn-ink">{{ t("plans.proCta") }}</a></div>
      </article>
    </section>

    <section id="premium-waitlist" class="container-narrow wait-wrap">
      <div v-reveal class="wait">
        <div class="wait-text">
          <span class="display wait-kicker">PREMIUM</span>
          <h2>{{ t("plans.waitTitle") }}</h2>
          <p>{{ t("plans.waitBody") }}</p>
        </div>
        <WaitlistForm id="premium-email" source="premium" />
      </div>
    </section>

    <section class="container-narrow compare">
      <h2 v-reveal class="compare-title">{{ t("plans.tableTitle") }}</h2>
      <div v-reveal class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col" class="col-feature">{{ t("plans.colFeature") }}</th>
              <th scope="col">{{ t("plans.colFree") }}</th>
              <th scope="col" class="col-pro">{{ t("plans.colPro") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row[0]">
              <th scope="row">{{ row[0] }}</th>
              <td class="cell-free" :data-label="t('plans.colFree')">{{ row[1] }}</td>
              <td class="cell-pro" :data-label="t('plans.colPro')">{{ row[2] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="container-narrow faq-wrap">
      <h2 v-reveal class="compare-title">{{ t("plans.faqTitle") }}</h2>
      <div class="faqs">
        <div v-for="(f, i) in faqs" :key="f.q" v-reveal="i * 0.1" class="faq">
          <h3>{{ f.q }}</h3>
          <p>{{ f.a }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  padding-top: clamp(48px, 7vw, 64px);
  padding-bottom: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.hero-label {
  justify-content: center;
}
.deco {
  position: absolute;
  border-radius: 50%;
}
.d1 {
  left: 8%;
  top: 60px;
  width: clamp(44px, 7vw, 90px);
  height: clamp(44px, 7vw, 90px);
  background: var(--sage);
  animation-duration: 7s;
}
.d2 {
  right: 10%;
  top: 120px;
  width: 40px;
  height: 40px;
  background: var(--mustard);
}
.d3 {
  right: 18%;
  top: 40px;
  width: 20px;
  height: 20px;
  border: 3px solid var(--ink);
}
.hero-title {
  position: relative;
  margin: 0;
  font-size: clamp(40px, 7.4vw, 88px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}
.coral {
  color: var(--coral);
}
.hero-lead {
  position: relative;
  max-width: 620px;
}

.plans {
  padding-top: 24px;
  padding-bottom: clamp(48px, 7vw, 80px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
  gap: 28px;
}
.plan {
  position: relative;
  overflow: hidden;
  border: 3px solid var(--ink);
  border-radius: 36px;
  padding: clamp(24px, 4vw, 40px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.plan-free {
  background: var(--white);
}
.plan-pro {
  background: var(--coral);
  box-shadow: 10px 10px 0 var(--ink);
}
.plan-deco {
  position: absolute;
  right: -20px;
  top: -20px;
  width: clamp(110px, 14vw, 170px);
}
.badge-spin {
  position: absolute;
  right: 18px;
  top: 18px;
  width: clamp(100px, 12vw, 150px);
  animation-duration: 20s;
}
.plan-name {
  position: relative;
  margin: 0;
  font-size: 20px;
  max-width: 70%;
}
.price-row {
  position: relative;
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.price {
  font-size: clamp(56px, 7vw, 80px);
  line-height: 1;
}
.price-soon {
  font-size: clamp(32px, 4vw, 44px);
}
.per {
  font-weight: 700;
}
.plan-desc {
  position: relative;
  margin: 0;
  max-width: 80%;
}
.muted {
  color: var(--muted);
}
.features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.features li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.features svg {
  flex: none;
  margin-top: 2px;
}
.plan-cta {
  margin-top: auto;
}
.btn-white {
  border: 2px solid var(--ink);
}

.wait-wrap {
  padding-bottom: clamp(48px, 7vw, 80px);
  scroll-margin-top: 90px;
}
.wait {
  background: var(--mustard);
  border: 3px solid var(--ink);
  border-radius: 32px;
  padding: clamp(24px, 4vw, 40px);
  display: flex;
  flex-wrap: wrap;
  gap: 20px 40px;
  align-items: center;
  justify-content: space-between;
}
.wait-text {
  flex: 1 1 320px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wait-kicker {
  letter-spacing: 0.14em;
  font-size: 14px;
}
.wait-text h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 900;
}
.wait-text p {
  margin: 0;
}
.wait :deep(.waitlist) {
  flex: 1 1 360px;
}

.compare {
  padding-bottom: clamp(48px, 7vw, 80px);
}
.compare-title {
  margin: 0 0 24px;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 900;
}
.table-wrap {
  border: 3px solid var(--ink);
  border-radius: 28px;
  overflow: hidden;
  background: var(--white);
}
table {
  width: 100%;
  border-collapse: collapse;
}
thead tr {
  background: var(--ink);
  color: var(--cream);
}
th,
td {
  text-align: left;
  padding: 18px 20px;
  vertical-align: top;
}
.col-feature {
  width: 26%;
}
.col-pro {
  background: var(--coral);
  color: var(--ink);
}
tbody tr {
  border-top: 2px solid var(--ink);
}
tbody th {
  font-size: 17px;
}
.cell-free {
  color: var(--muted);
}
.cell-pro {
  background: var(--rose-tint);
  font-weight: 700;
}

.faq-wrap {
  padding-bottom: 40px;
}
.faqs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 20px;
}
.faq {
  border: 2px solid var(--ink);
  border-radius: 24px;
  padding: 24px;
}
.faq h3 {
  margin: 0 0 8px;
  font-size: 18px;
}
.faq p {
  margin: 0;
  color: var(--muted);
}

/* 手機：比較表改成一列一張卡 */
@media (max-width: 680px) {
  thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  table,
  tbody,
  tr,
  th,
  td {
    display: block;
    width: 100%;
  }
  tbody tr:first-child {
    border-top: 0;
  }
  tbody th {
    background: var(--cream);
    padding: 14px 18px;
  }
  td {
    padding: 12px 18px;
  }
  td::before {
    content: attr(data-label);
    display: block;
    font-size: 13px;
    font-weight: 900;
    color: var(--ink);
    margin-bottom: 2px;
  }
  .plan-name,
  .plan-desc {
    max-width: 62%;
  }
}
</style>
