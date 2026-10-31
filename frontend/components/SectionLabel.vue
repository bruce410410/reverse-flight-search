<script setup lang="ts">
defineProps<{ en: string; local: string; dot?: string; dark?: boolean }>();
</script>

<template>
  <div class="label">
    <span class="label-dot" :style="{ background: dot ?? '#e36255' }" />
    <span class="label-en">{{ en }}</span>
    <span class="label-local" :style="dark ? { color: '#ec9a86' } : undefined">{{ local }}</span>
  </div>
</template>
