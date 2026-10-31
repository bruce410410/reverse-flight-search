<script setup lang="ts">
const { t } = useI18n();
useHead({ title: () => t("privacy.label") });

const items = computed(() =>
  [1, 2, 3, 4, 5].map((n) => ({ h: t(`privacy.h${n}`), b: t(`privacy.b${n}`) })),
);
const colors = ["#e36255", "#f3c262", "#a2c5c9", "#ec9a86", "#2D2420"];
</script>

<template>
  <div class="container-narrow page">
    <header class="head">
      <SectionLabel en="PRIVACY" :local="t('privacy.label')" dot="#a2c5c9" />
      <h1 class="h-section">{{ t("privacy.title") }}</h1>
      <p class="lead">{{ t("privacy.lead") }}</p>
    </header>
    <ol class="items">
      <li v-for="(item, i) in items" :key="item.h" v-reveal="i * 0.06" class="item">
        <span class="num display" :style="{ background: colors[i], color: i === 4 ? '#f1e0ce' : '#2D2420' }">{{ i + 1 }}</span>
        <div>
          <h2>{{ item.h }}</h2>
          <p>{{ item.b }}</p>
        </div>
      </li>
    </ol>
    <p class="links">
      <NuxtLink to="/settings" class="more">{{ t("common.footer.settings") }}<span class="more-arrow" aria-hidden="true">→</span></NuxtLink>
      <NuxtLink to="/status" class="more">{{ t("common.footer.status") }}<span class="more-arrow" aria-hidden="true">→</span></NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.page {
  padding-top: clamp(40px, 6vw, 64px);
  padding-bottom: clamp(48px, 7vw, 80px);
}
.head {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
  max-width: 760px;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.item {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: var(--radius-md);
  padding: clamp(18px, 3vw, 26px);
}
.num {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: 18px;
}
.item h2 {
  margin: 0 0 6px;
  font-size: clamp(18px, 2vw, 21px);
}
.item p {
  margin: 0;
  color: var(--muted);
}
.links {
  margin: 32px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
}
</style>
