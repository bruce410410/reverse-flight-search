<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();
const { t, restoreLocale } = useI18n();
useHead({ title: () => (props.error.statusCode === 404 ? t("notFound.title") : String(props.error.statusCode)) });
onMounted(restoreLocale);

function goHome() {
  clearError({ redirect: "/" });
}
</script>

<template>
  <div class="shell">
    <SiteHeader />
    <main id="main" class="container page">
      <svg class="art a-float" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="86" fill="#a2c5c9" />
        <g stroke="#2D2420" stroke-width="4" stroke-linejoin="round">
          <path d="M100 30 C 72 30 56 50 56 72 C 56 106 100 146 100 146 C 100 146 144 106 144 72 C 144 50 128 30 100 30z" fill="#e36255" />
          <circle cx="100" cy="72" r="16" fill="#f1e0ce" />
        </g>
        <text x="100" y="186" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="30" fill="#2D2420">{{ error.statusCode }}</text>
      </svg>
      <h1 class="h-section">{{ error.statusCode === 404 ? t("notFound.title") : error.statusMessage || error.message }}</h1>
      <p class="lead">{{ t("notFound.body") }}</p>
      <button type="button" class="btn btn-coral" @click="goHome">{{ t("notFound.back") }}</button>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.page {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 18px;
  padding-top: 64px;
  padding-bottom: 64px;
}
.art {
  width: clamp(140px, 22vw, 200px);
}
.lead {
  max-width: 520px;
}
</style>
