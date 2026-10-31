<script setup lang="ts">
import type { CacheMeta } from "~/types/reverseSearch";

const props = defineProps<{ cache: CacheMeta }>();
const { t } = useI18n();

const warn = computed(() => props.cache.source === "cache-with-notice" || props.cache.liveValidationFailed);
</script>

<template>
  <div class="notice" :class="warn ? 'notice-mustard' : 'notice-sage'" role="status">
    <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2D2420" stroke-width="2.4" stroke-linecap="round" class="icon">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
    <p class="text">
      <strong>{{ t(`results.source.${cache.source}`) }}</strong>
      <span v-if="cache.liveValidationFailed"> {{ t("results.liveFailed") }}</span>
      {{ t("results.cacheTip") }}
    </p>
  </div>
</template>

<style scoped>
.icon {
  flex: none;
  margin-top: 1px;
}
.text {
  margin: 0;
}
</style>
