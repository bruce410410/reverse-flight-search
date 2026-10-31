<script setup lang="ts">
import type { FlightStatusCheck } from "~/types/reverseSearch";

const props = defineProps<{ flightStatus: FlightStatusCheck }>();
const { t } = useI18n();

// SerpApi 目前不做即時航班校驗（多半是 not-checked），只有真的校驗過的狀態才顯示，避免一排灰色標籤。
const visible = computed(() => ["confirmed", "schedule-changed", "cancelled"].includes(props.flightStatus.status));
</script>

<template>
  <span v-if="visible" class="status" :class="`status-${flightStatus.status}`" :title="flightStatus.details">
    {{ t(`results.flightStatus.${flightStatus.status}`) }}
  </span>
</template>

<style scoped>
.status {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  border: 2px solid var(--ink);
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}
.status-confirmed {
  background: var(--sage);
}
.status-schedule-changed {
  background: var(--mustard);
}
.status-cancelled {
  background: var(--coral);
}
</style>
