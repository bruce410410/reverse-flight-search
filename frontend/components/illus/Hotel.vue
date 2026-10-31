<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <svg viewBox="0 0 560 460" class="illus" aria-hidden="true">
    <circle cx="300" cy="230" r="200" fill="#f1e0ce" opacity=".6" />
    <g stroke="#2D2420" stroke-width="4" stroke-linejoin="round">
      <path d="M140 120 L 300 40 L 460 120z" fill="#e36255" />
      <rect x="150" y="120" width="300" height="300" fill="#fff" />
      <path d="M150 220 H 450 M150 320 H 450 M300 120 V 420" fill="none" />
      <rect x="270" y="360" width="60" height="60" fill="#a2c5c9" />
    </g>
    <text x="300" y="100" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="22" fill="#f1e0ce">HOTEL</text>
    <g stroke="#2D2420" stroke-width="3">
      <g fill="#ec9a86"><circle cx="195" cy="170" r="14" /><circle cx="235" cy="170" r="14" /></g>
      <g fill="#a2c5c9"><circle cx="345" cy="170" r="14" /><circle cx="385" cy="170" r="14" /><circle cx="365" cy="196" r="12" /></g>
      <g fill="#f3c262"><circle cx="210" cy="270" r="14" /></g>
      <rect x="320" y="245" width="110" height="50" rx="8" fill="#f1e0ce" />
    </g>
    <g transform="translate(375 270)"><g class="a-float" style="animation-duration: 3s"><path d="M0 -22 L 22 16 H -22z" fill="#e36255" stroke="#2D2420" stroke-width="3" stroke-linejoin="round" /><path d="M0 -8 V 3 M0 9 v1" stroke="#2D2420" stroke-width="4" stroke-linecap="round" /></g></g>
    <g class="a-float" style="animation-duration: 5s">
      <g transform="rotate(-8 90 200)">
        <rect x="20" y="170" width="140" height="64" rx="12" fill="#2D2420" />
        <text x="90" y="198" text-anchor="middle" font-size="14" font-weight="700" fill="#f3c262">{{ t("rooms.two.perPerson") }}</text>
        <text x="90" y="222" text-anchor="middle" font-size="18" font-weight="900" fill="#f1e0ce">$ $ $</text>
      </g>
    </g>
    <g transform="translate(490 330)"><g class="a-wiggle"><circle r="30" fill="#a2c5c9" stroke="#2D2420" stroke-width="4" /><path d="M-12 0 l8 9 l16 -18" fill="none" stroke="#2D2420" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /></g></g>
  </svg>
</template>
