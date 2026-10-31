<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <svg viewBox="0 0 400 300" class="illus" aria-hidden="true">
    <g stroke="#2D2420" stroke-width="3" stroke-linejoin="round">
      <g transform="rotate(-10 120 170)"><rect x="40" y="100" width="170" height="130" rx="10" fill="#f1e0ce" /><rect x="52" y="112" width="146" height="90" fill="#ec9a86" /></g>
      <g transform="rotate(6 280 150)"><rect x="200" y="80" width="170" height="130" rx="10" fill="#f1e0ce" /><rect x="212" y="92" width="146" height="90" fill="#f3c262" /></g>
      <rect x="110" y="60" width="190" height="150" rx="10" fill="#fff" />
      <rect x="122" y="72" width="166" height="104" fill="#7FA8AD" />
      <path d="M122 176 L 180 120 H 230 L 288 176z" fill="#5E4E45" />
      <rect x="136" y="96" width="34" height="60" fill="#f1e0ce" />
      <rect x="240" y="88" width="36" height="68" fill="#e36255" />
      <path d="M196 168 h18 M192 156 h26 M200 144 h10" fill="none" stroke="#fff" stroke-width="4" />
    </g>
    <g class="turn a-wiggle">
      <path d="M190 140 V 110 H 216" fill="none" stroke="#2D2420" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M212 98 L 228 110 L 212 122z" fill="#2D2420" />
    </g>
    <text x="205" y="200" text-anchor="middle" font-weight="900" font-size="15" fill="#2D2420">{{ t("home.illus.turn") }}</text>
  </svg>
</template>

<style scoped>
.turn {
  transform-origin: 205px 110px;
  transform-box: view-box;
}
</style>
