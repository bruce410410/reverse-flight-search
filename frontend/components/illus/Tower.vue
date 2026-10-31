<template>
  <svg viewBox="0 0 420 340" class="illus" aria-hidden="true">
    <circle cx="210" cy="180" r="150" fill="#a2c5c9" />
    <g stroke="#2D2420" stroke-width="4" stroke-linejoin="round">
      <path d="M186 320 L 196 160 H 224 L 234 320z" fill="#f1e0ce" />
      <path d="M150 160 H 270 L 256 100 H 164z" fill="#2D2420" />
      <path d="M164 100 H 256 L 246 80 H 174z" fill="#e36255" />
      <rect x="170" y="112" width="80" height="34" rx="4" fill="#f3c262" />
      <path d="M210 80 V 50" fill="none" />
    </g>
    <circle cx="210" cy="46" r="8" fill="#e36255" stroke="#2D2420" stroke-width="3" class="a-blink" />
    <g class="sweep"><path d="M340 180 l20 -7 l-7 20 l-3 -7z" fill="#2D2420" /></g>
    <g fill="none" stroke="#2D2420" stroke-width="3" stroke-linecap="round" opacity=".5">
      <path d="M232 34 q 14 12 0 24" /><path d="M244 26 q 22 20 0 40" />
    </g>
  </svg>
</template>

<style scoped>
.sweep {
  transform-origin: 210px 180px;
  transform-box: view-box;
  animation: spin 14s linear infinite;
}
</style>
