<template>
  <svg viewBox="0 0 200 160" class="illus" aria-hidden="true">
    <rect x="10" y="20" width="150" height="110" rx="14" fill="#f1e0ce" />
    <rect x="10" y="20" width="150" height="26" rx="12" fill="#a2c5c9" />
    <g fill="#2D2420"><circle cx="28" cy="33" r="4" /><circle cx="42" cy="33" r="4" /><circle cx="56" cy="33" r="4" /></g>
    <g class="key a-wiggle">
      <circle cx="140" cy="110" r="26" fill="#f3c262" stroke="#2D2420" stroke-width="4" />
      <circle cx="140" cy="110" r="9" fill="#2D2420" />
      <path d="M120 128 L 80 150 M96 141 l-6 -10 M86 147 l-6 -10" stroke="#f3c262" stroke-width="8" stroke-linecap="round" />
    </g>
  </svg>
</template>

<style scoped>
.key {
  transform-origin: 140px 110px;
  transform-box: view-box;
}
</style>
