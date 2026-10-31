<template>
  <svg viewBox="0 0 400 300" class="illus" aria-hidden="true">
    <g fill="#f1e0ce" opacity=".5">
      <path d="M30 60 C 80 30 160 40 170 80 S 120 150 70 140 S 0 90 30 60z" />
      <path d="M250 180 C 300 160 380 170 380 220 S 320 280 270 260 S 210 200 250 180z" />
    </g>
    <g fill="none" stroke="#2D2420" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round" class="a-dash">
      <path d="M60 80 Q 180 80 270 170" />
      <path d="M50 250 Q 170 250 270 170" />
      <path d="M360 40 Q 360 110 270 170" />
      <path d="M150 140 Q 220 150 270 170" />
    </g>
    <g fill="#f1e0ce" stroke="#2D2420" stroke-width="3">
      <circle cx="60" cy="80" r="10" /><circle cx="50" cy="250" r="10" /><circle cx="360" cy="40" r="10" /><circle cx="150" cy="140" r="10" />
    </g>
    <circle cx="270" cy="170" r="26" fill="#f3c262" stroke="#2D2420" stroke-width="3" />
    <g class="orbiter"><path d="M262 164l20-7-7 20-3-7z" fill="#2D2420" /></g>
  </svg>
</template>

<style scoped>
.orbiter {
  transform-origin: 270px 170px;
  transform-box: view-box;
  animation: orbit 6s linear infinite;
}
</style>
