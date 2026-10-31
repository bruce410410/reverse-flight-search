<script setup lang="ts">
const { t } = useI18n();
useHead({ title: () => t("common.nav.rooms") });
</script>

<template>
  <div>
    <section id="waitlist" class="hero">
      <span class="dot a-drift" aria-hidden="true" />
      <div class="container hero-grid">
        <div class="hero-text">
          <div class="kicker-row">
            <span class="mono kicker">{{ t("rooms.hero.kicker") }}</span>
            <span class="soon">{{ t("common.comingSoon") }}</span>
          </div>
          <h1 class="hero-title">
            <span class="rise-line"><span>{{ t("rooms.hero.title1") }}</span></span>
            <span class="rise-line"><span>{{ t("rooms.hero.title2") }}</span></span>
          </h1>
          <p class="hero-lead">{{ t("rooms.hero.lead") }}</p>
          <WaitlistForm id="rooms-email" source="rooms" class="waitlist" />
        </div>
        <div v-reveal class="hero-art">
          <IllusHotel />
        </div>
      </div>
    </section>

    <section class="container section">
      <div v-reveal class="head">
        <SectionLabel en="TWO THINGS" :local="t('rooms.two.label')" dot="#f3c262" />
        <h2 class="h-section">{{ t("rooms.two.title") }}</h2>
      </div>
      <div class="cards">
        <article v-reveal class="card card-light lift">
          <div class="card-top">
            <span class="display card-label">{{ t("rooms.two.c1Label") }}</span>
            <span class="room-chip">{{ t("rooms.two.c1Chip") }}</span>
          </div>
          <div class="options">
            <div class="option option-best">
              <svg aria-hidden="true" width="64" height="40" viewBox="0 0 64 40"><rect x="2" y="8" width="60" height="30" rx="6" fill="#fff" stroke="#2D2420" stroke-width="3" /><g fill="#ec9a86" stroke="#2D2420" stroke-width="2"><circle cx="16" cy="23" r="6" /><circle cx="28" cy="23" r="6" /><circle cx="40" cy="23" r="6" /><circle cx="52" cy="23" r="6" /></g></svg>
              <div class="option-text"><strong>{{ t("rooms.two.o1") }}</strong><span>{{ t("rooms.two.o1d") }}</span></div>
              <div class="option-price">
                <span class="best-tag">{{ t("rooms.two.best") }}</span>
                <span class="price">$ / {{ t("rooms.two.perPerson") }}</span>
              </div>
            </div>
            <div class="option">
              <svg aria-hidden="true" width="64" height="40" viewBox="0 0 64 40"><rect x="2" y="8" width="28" height="30" rx="6" fill="#fff" stroke="#2D2420" stroke-width="3" /><rect x="34" y="8" width="28" height="30" rx="6" fill="#fff" stroke="#2D2420" stroke-width="3" /><g fill="#a2c5c9" stroke="#2D2420" stroke-width="2"><circle cx="11" cy="23" r="5" /><circle cx="22" cy="23" r="5" /><circle cx="43" cy="23" r="5" /><circle cx="54" cy="23" r="5" /></g></svg>
              <div class="option-text"><strong>{{ t("rooms.two.o2") }}</strong><span class="muted">{{ t("rooms.two.o2d") }}</span></div>
              <div class="option-price"><span class="price">$$ / {{ t("rooms.two.perPerson") }}</span></div>
            </div>
            <div class="option option-out">
              <svg aria-hidden="true" width="64" height="40" viewBox="0 0 64 40"><rect x="2" y="8" width="60" height="30" rx="6" fill="#fff" stroke="#2D2420" stroke-width="3" /><path d="M32 12 L 44 34 H 20z" fill="#e36255" stroke="#2D2420" stroke-width="2" /></svg>
              <div class="option-text"><strong class="strike">{{ t("rooms.two.o3") }}</strong><span class="warn">{{ t("rooms.two.o3d") }}</span></div>
              <div class="option-price"><span class="price warn">—</span></div>
            </div>
          </div>
        </article>

        <article v-reveal="0.12" class="card card-dark lift">
          <div class="card-top">
            <span class="display card-label mustard">{{ t("rooms.two.c2Label") }}</span>
            <span class="scanned">{{ t("rooms.two.scanned") }}</span>
          </div>
          <div class="bubbles">
            <p class="bubble b1">{{ t("rooms.two.r1a") }}<mark class="bad">{{ t("rooms.two.r1m") }}</mark>{{ t("rooms.two.r1b") }}</p>
            <p class="bubble b2">{{ t("rooms.two.r2a") }}<mark class="bad">{{ t("rooms.two.r2m") }}</mark>{{ t("rooms.two.r2b") }}</p>
            <p class="bubble b3">{{ t("rooms.two.r3a") }}<mark class="good">{{ t("rooms.two.r3m") }}</mark>{{ t("rooms.two.r3b") }}</p>
          </div>
          <div class="tags">
            <span class="tag bad">⚠ {{ t("rooms.two.t1") }}</span>
            <span class="tag bad">⚠ {{ t("rooms.two.t2") }}</span>
            <span class="tag good">✓ {{ t("rooms.two.t3") }}</span>
            <span class="tag good">✓ {{ t("rooms.two.t4") }}</span>
          </div>
        </article>
      </div>
      <p class="note">{{ t("rooms.note") }}</p>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  background: var(--mustard);
  border-bottom: 3px solid var(--ink);
  overflow: hidden;
  scroll-margin-top: 80px;
}
.dot {
  position: absolute;
  left: 44%;
  top: 40px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--coral);
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 48px);
  align-items: center;
  padding-top: clamp(48px, 7vw, 72px);
  padding-bottom: clamp(48px, 8vw, 88px);
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}
.kicker-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.kicker {
  font-weight: 700;
  letter-spacing: 0.12em;
  font-size: 14px;
}
.soon {
  font-size: 13px;
  font-weight: 900;
  background: var(--ink);
  color: var(--mustard);
  border-radius: 999px;
  padding: 3px 12px;
}
.hero-title {
  margin: 0;
  font-size: clamp(36px, 5.6vw, 66px);
  line-height: 1.12;
  font-weight: 900;
  overflow-wrap: anywhere;
}
.hero-lead {
  margin: 0;
  font-size: clamp(16px, 1.6vw, 19px);
  max-width: 520px;
}
.waitlist {
  max-width: 520px;
}
.hero-art {
  display: flex;
  justify-content: center;
}
.hero-art :deep(svg) {
  width: 100%;
  max-width: 560px;
}

.head {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 36px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 24px;
}
.card {
  border: 3px solid var(--ink);
  border-radius: var(--radius-lg);
  padding: clamp(20px, 3.4vw, 32px);
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}
.card-light {
  background: var(--white);
}
.card-dark {
  background: var(--ink);
  color: var(--cream);
}
.card-top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.card-label {
  font-size: 18px;
}
.mustard {
  color: var(--mustard);
}
.room-chip {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  border: 2px solid var(--ink);
}
.scanned {
  font-size: 14px;
  color: var(--on-dark-muted);
}
.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 2px solid var(--ink);
  border-radius: 20px;
  background: var(--cream);
}
.option svg {
  flex: none;
}
.option-best {
  border-width: 3px;
  background: var(--mustard);
  box-shadow: 5px 5px 0 var(--ink);
}
.option-out {
  border-style: dashed;
  border-color: var(--accent-text);
  opacity: 0.8;
}
.option-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}
.option-text strong {
  font-size: 18px;
}
.muted {
  color: var(--muted);
}
.warn {
  color: var(--accent-text);
  font-weight: 700;
}
.strike {
  text-decoration: line-through;
}
.option-price {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.best-tag {
  font-size: 12px;
  font-weight: 900;
  background: var(--ink);
  color: var(--mustard);
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.price {
  font-weight: 900;
  font-size: 18px;
  white-space: nowrap;
}
.bubbles {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bubble {
  margin: 0;
  background: var(--cream);
  color: var(--ink);
  padding: 14px 18px;
}
.b1 {
  border-radius: 18px 18px 18px 4px;
  transform: rotate(-1deg);
}
.b2 {
  border-radius: 18px 18px 4px 18px;
  margin-left: clamp(16px, 4vw, 40px);
  transform: rotate(1deg);
}
.b3 {
  border-radius: 18px 18px 18px 4px;
  transform: rotate(-0.5deg);
}
mark {
  color: var(--ink);
  padding: 0 4px;
  border-radius: 4px;
  font-weight: 900;
}
mark.bad,
.tag.bad {
  background: var(--coral);
}
mark.good,
.tag.good {
  background: var(--sage);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  padding: 5px 12px;
  border-radius: 999px;
  color: var(--ink);
  font-weight: 900;
  font-size: 14px;
}
.note {
  margin: 24px 0 0;
  color: var(--muted);
  font-size: 14px;
}

@media (max-width: 900px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .hero-art :deep(svg) {
    max-width: 440px;
  }
  .dot {
    left: auto;
    right: 8%;
    top: auto;
    bottom: 40%;
  }
}
@media (max-width: 480px) {
  .option {
    flex-wrap: wrap;
  }
  .option-out .option-price {
    display: none;
  }
  .option-price {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
    align-items: center;
  }
}
</style>
