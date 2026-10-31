<script setup lang="ts">
const { t } = useI18n();

// key 對應 i18n 的 cities.*，dest 是點下去實際搜尋的機場代碼。
const cards = [
  { key: "TYO", dest: "NRT", bg: "#e36255", tilt: -2 },
  { key: "SEL", dest: "ICN", bg: "#a2c5c9", tilt: 2 },
  { key: "BKK", dest: "BKK", bg: "#f3c262", tilt: -1 },
  { key: "LON", dest: "LHR", bg: "#ec9a86", tilt: 2 },
  { key: "SYD", dest: "SYD", bg: "#a2c5c9", tilt: -2 },
  { key: "KIX", dest: "KIX", bg: "#f1e0ce", tilt: 1 },
];
// 輪播需要兩組一模一樣的卡片才能無縫循環；第二組對輔助技術隱藏。
const loops = [0, 1];
</script>

<template>
  <div class="carousel" :aria-label="t('home.carousel')" role="region">
    <div class="track">
      <ul v-for="loop in loops" :key="loop" class="set" :aria-hidden="loop === 1 ? 'true' : undefined">
        <li v-for="(c, i) in cards" :key="c.key" class="item" :class="{ low: i % 2 === 1 }">
          <NuxtLink
            :to="{ path: '/flights/results', query: { dest: c.dest } }"
            class="card lift zoom"
            :style="{ background: c.bg, transform: `rotate(${c.tilt}deg)` }"
            :tabindex="loop === 1 ? -1 : undefined"
          >
            <svg viewBox="0 0 280 296" class="art" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
              <template v-if="c.key === 'TYO'">
                <circle cx="208" cy="78" r="34" fill="#f3c262" stroke="#2D2420" stroke-width="3" />
                <path d="M-4 300 L 70 196 Q 84 182 98 196 L 180 300z" fill="#f1e0ce" stroke="#2D2420" stroke-width="3" stroke-linejoin="round" />
                <path d="M50 224 L 70 196 Q 84 182 98 196 L 118 224 Q 104 216 96 226 Q 84 214 72 226 Q 62 216 50 224z" fill="#fff" stroke="#2D2420" stroke-width="3" stroke-linejoin="round" />
                <g stroke="#2D2420" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
                  <path d="M190 40 L 170 300 M190 40 L 210 300" fill="none" />
                  <path d="M176 222 h28 M180 160 h20 M184 110 h12" fill="none" />
                  <rect x="166" y="150" width="48" height="14" rx="3" fill="#f1e0ce" />
                  <rect x="160" y="214" width="60" height="16" rx="3" fill="#f1e0ce" />
                  <path d="M172 230 L 160 300 M208 230 L 220 300 M176 260 L 204 290 M204 260 L 176 290" fill="none" />
                </g>
              </template>
              <template v-else-if="c.key === 'SEL'">
                <g fill="#fff" opacity=".8"><ellipse cx="60" cy="70" rx="36" ry="12" /><ellipse cx="80" cy="60" rx="22" ry="12" /></g>
                <path d="M-10 300 Q 120 170 290 300z" fill="#7FA8AD" stroke="#2D2420" stroke-width="3" />
                <g stroke="#2D2420" stroke-width="3" stroke-linejoin="round">
                  <rect x="134" y="80" width="12" height="130" fill="#f1e0ce" />
                  <ellipse cx="140" cy="140" rx="26" ry="12" fill="#e36255" />
                  <rect x="128" y="112" width="24" height="16" rx="4" fill="#f3c262" />
                  <path d="M140 80 V 44" fill="none" />
                  <path d="M20 262 Q 90 236 160 262 Q 120 254 90 254 Q 56 254 20 262z" fill="#2D2420" />
                  <rect x="40" y="260" width="100" height="40" fill="#f1e0ce" />
                  <rect x="76" y="272" width="28" height="28" fill="#ec9a86" />
                </g>
              </template>
              <template v-else-if="c.key === 'BKK'">
                <circle cx="70" cy="80" r="26" fill="#f1e0ce" stroke="#2D2420" stroke-width="3" />
                <g stroke="#2D2420" stroke-width="3" stroke-linejoin="round">
                  <path d="M140 40 C 150 90 176 120 176 160 H 104 C 104 120 130 90 140 40z" fill="#e36255" />
                  <rect x="96" y="160" width="88" height="20" fill="#f1e0ce" />
                  <path d="M80 180 H 200 L 214 300 H 66z" fill="#ec9a86" />
                  <path d="M124 300 V 238 Q 140 216 156 238 V 300" fill="#2D2420" />
                  <path d="M46 300 V 220 C 50 200 58 190 62 176 C 66 190 74 200 78 220 V 300" fill="#f1e0ce" />
                  <path d="M202 300 V 220 C 206 200 214 190 218 176 C 222 190 230 200 234 220 V 300" fill="#f1e0ce" />
                </g>
              </template>
              <template v-else-if="c.key === 'LON'">
                <g stroke="#2D2420" stroke-width="3" stroke-linejoin="round">
                  <path d="M80 60 L 100 30 L 120 60z" fill="#2D2420" />
                  <rect x="78" y="60" width="44" height="240" fill="#f1e0ce" />
                  <circle cx="100" cy="98" r="16" fill="#fff" />
                  <path d="M100 98 V 88 M100 98 h8" fill="none" stroke-linecap="round" />
                  <path d="M86 140 h28 M86 170 h28 M86 200 h28 M86 230 h28" fill="none" />
                  <rect x="132" y="196" width="128" height="88" rx="12" fill="#e36255" />
                  <rect x="144" y="208" width="104" height="22" rx="4" fill="#f1e0ce" />
                  <rect x="144" y="242" width="104" height="22" rx="4" fill="#f1e0ce" />
                  <circle cx="160" cy="290" r="11" fill="#2D2420" />
                  <circle cx="234" cy="290" r="11" fill="#2D2420" />
                </g>
              </template>
              <template v-else-if="c.key === 'SYD'">
                <circle cx="214" cy="70" r="28" fill="#f3c262" stroke="#2D2420" stroke-width="3" />
                <g stroke="#2D2420" stroke-width="3" stroke-linejoin="round">
                  <path d="M40 240 Q 60 150 120 120 Q 100 190 110 240z" fill="#fff" />
                  <path d="M96 240 Q 120 160 180 140 Q 160 200 170 240z" fill="#f1e0ce" />
                  <path d="M156 240 Q 180 180 236 168 Q 222 210 228 240z" fill="#fff" />
                  <rect x="28" y="238" width="224" height="20" fill="#ec9a86" />
                </g>
                <path d="M0 270 Q 35 260 70 270 T 140 270 T 210 270 T 280 270 V 300 H 0z" fill="#5E8E94" />
              </template>
              <template v-else>
                <circle cx="140" cy="140" r="90" fill="#f3c262" opacity=".55" />
                <g stroke="#2D2420" stroke-width="3" stroke-linejoin="round">
                  <path d="M34 92 Q 140 72 246 92 L 240 112 Q 140 96 40 112z" fill="#e36255" />
                  <rect x="56" y="132" width="168" height="16" fill="#e36255" />
                  <rect x="74" y="108" width="18" height="192" fill="#e36255" />
                  <rect x="188" y="108" width="18" height="192" fill="#e36255" />
                  <rect x="132" y="112" width="16" height="22" fill="#2D2420" />
                </g>
                <g fill="#ec9a86" stroke="#2D2420" stroke-width="2">
                  <path d="M40 220 l8 -14 l8 14 l12 -4 l-8 12 l8 10 h-40 l8 -10 l-8 -12z" />
                  <path d="M220 196 l6 -10 l6 10 l9 -3 l-6 9 l6 7 h-30 l6 -7 l-6 -9z" />
                </g>
              </template>
            </svg>
            <span class="caption">
              <span class="city">{{ t(`cities.${c.key}`) }}</span>
              <span class="code">{{ c.dest }}</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
    <svg aria-hidden="true" viewBox="0 0 1440 120" preserveAspectRatio="none" class="trail">
      <path d="M-20 90 Q 360 10 720 60 T 1460 30" fill="none" stroke="#2D2420" stroke-width="2.5" stroke-dasharray="8 16" class="a-dash" />
    </svg>
  </div>
</template>

<style scoped>
.carousel {
  position: relative;
  padding: 30px 0 70px;
  overflow: hidden;
}
.track {
  display: flex;
  width: max-content;
  animation: marquee 46s linear infinite;
}
.carousel:hover .track,
.carousel:focus-within .track {
  animation-play-state: paused;
}
.set {
  display: flex;
  gap: 24px;
  margin: 0;
  padding: 0 24px 0 0;
  list-style: none;
}
.item.low {
  margin-top: 30px;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 360px;
  border-radius: 28px;
  border: 3px solid var(--ink);
  text-decoration: none;
  overflow: hidden;
}
.art {
  display: block;
  width: 100%;
  flex: 1;
}
.caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  background: var(--ink);
  color: var(--cream);
  padding: 14px 22px 16px;
  font-family: var(--font-display);
  font-weight: 800;
}
.city {
  font-size: 24px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.code {
  font-size: 18px;
  color: var(--mustard);
}
.trail {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6px;
  width: 100%;
  height: 80px;
  pointer-events: none;
}
@media (max-width: 640px) {
  .card {
    width: 210px;
    height: 270px;
    border-radius: 22px;
  }
  .city {
    font-size: 19px;
  }
  .set {
    gap: 16px;
    padding-right: 16px;
  }
  .carousel {
    padding: 20px 0 50px;
  }
}
</style>
