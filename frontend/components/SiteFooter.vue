<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const hideFooterCta = useState("site-footer-hide-cta", () => false);

const showCta = computed(() => !hideFooterCta.value && !route.path.startsWith("/flights/results"));

const ctaLinks = computed(() => {
  const path = route.path;
  if (path === "/") {
    return [
      { to: "/flights", label: t("common.cta.flights") },
      { to: "/route-storyboard", label: t("common.cta.routes") },
      { to: "/rooms#waitlist", label: t("common.cta.rooms") },
    ];
  }
  if (path.startsWith("/route-storyboard")) return [{ to: "/route-storyboard#r-from", label: t("common.cta.routes") }];
  if (path.startsWith("/rooms")) return [{ to: "/rooms#waitlist", label: t("common.cta.rooms") }];
  if (path.startsWith("/plans")) return [{ to: "/plans#premium-waitlist", label: t("common.cta.plans") }];
  return [{ to: "/flights", label: t("common.cta.flights") }];
});
</script>

<template>
  <footer>
    <section v-if="showCta" class="container cta-wrap" aria-labelledby="cta-title">
      <div v-reveal class="cta">
        <svg aria-hidden="true" viewBox="0 0 600 300" class="cta-art">
          <path d="M0 260 Q 260 260 380 140 T 600 40" fill="none" stroke="#2D2420" stroke-width="3" stroke-dasharray="8 14" class="a-dash" />
          <circle cx="520" cy="210" r="70" fill="#f3c262" />
          <circle cx="440" cy="60" r="18" fill="#f1e0ce" />
        </svg>
        <div class="cta-text">
          <span class="label-en">{{ t("common.cta.kicker") }}</span>
          <h2 id="cta-title" class="cta-title">{{ t("common.cta.title1") }}<br />{{ t("common.cta.title2") }}</h2>
        </div>
        <div class="cta-actions" :class="{ multi: ctaLinks.length > 1 }">
          <NuxtLink v-for="link in ctaLinks" :key="link.to" :to="link.to" class="btn btn-ink cta-btn">
            {{ link.label }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="container foot">
      <NuxtLink to="/" class="foot-brand">
        <BrandMark />
        {{ t("common.brand") }}
      </NuxtLink>
      <nav :aria-label="t('common.footer.nav')" class="foot-nav">
        <NuxtLink to="/plans">{{ t("common.footer.plans") }}</NuxtLink>
        <NuxtLink to="/settings">{{ t("common.footer.settings") }}</NuxtLink>
        <NuxtLink to="/status">{{ t("common.footer.status") }}</NuxtLink>
        <NuxtLink to="/privacy">{{ t("common.footer.privacy") }}</NuxtLink>
      </nav>
      <span class="copy">{{ t("common.footer.copyright") }}</span>
    </div>
  </footer>
</template>

<style scoped>
.cta-wrap {
  padding-top: clamp(64px, 8vw, 96px);
  padding-bottom: 48px;
}
.cta {
  position: relative;
  background: var(--coral);
  border: 3px solid var(--ink);
  border-radius: 40px;
  padding: clamp(36px, 6vw, 64px);
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}
.cta-art {
  position: absolute;
  right: -40px;
  top: -20px;
  width: min(560px, 90%);
  opacity: 0.9;
  pointer-events: none;
}
.cta-text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cta-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.cta-btn {
  position: relative;
  min-height: 64px;
  font-size: 19px;
  padding: 0 34px;
}
.cta-actions {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}
.cta-actions.multi .cta-btn {
  min-height: 56px;
  font-size: 16px;
  padding: 0 24px;
}
.foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px 24px;
  padding-top: 24px;
  padding-bottom: 48px;
  font-size: 14px;
  color: var(--muted);
}
.foot-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: 18px;
  color: var(--ink);
  text-decoration: none;
}
.foot-brand :deep(.brand-mark) {
  width: 28px;
  height: 28px;
}
.foot-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
}
@media (max-width: 640px) {
  .foot {
    flex-direction: column;
    align-items: flex-start;
  }
  .cta-btn {
    width: 100%;
  }
  .cta-actions {
    width: 100%;
  }
}
</style>
