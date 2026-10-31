<script setup lang="ts">
const { t, locale, setLocale, locales } = useI18n();
const route = useRoute();
const menuOpen = ref(false);
const langOpen = ref(false);

const links = computed(() => [
  { to: "/flights", label: t("common.nav.flights") },
  { to: "/route-storyboard", label: t("common.nav.routes") },
  { to: "/rooms", label: t("common.nav.rooms") },
  { to: "/plans", label: t("common.nav.plans") },
]);

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`);
}

const currentLocale = computed(() => locales.find((l) => l.code === locale.value) ?? locales[0]);

function chooseLocale(code: typeof locale.value) {
  setLocale(code);
  langOpen.value = false;
}

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
    langOpen.value = false;
  },
);
</script>

<template>
  <header class="site-header">
    <div class="container bar">
      <NuxtLink to="/" class="brand">
        <BrandMark />
        <span>{{ t("common.brand") }}</span>
      </NuxtLink>

      <nav :aria-label="t('common.mainNav')" class="nav" :class="{ open: menuOpen }">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :aria-current="isActive(link.to) ? 'page' : undefined"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="tools">
        <div
          class="lang"
          :class="{ open: langOpen }"
          @mouseenter="langOpen = true"
          @mouseleave="langOpen = false"
          @focusin="langOpen = true"
          @keydown.esc="langOpen = false"
        >
          <button
            type="button"
            class="lang-current"
            :aria-label="t('common.language')"
            :aria-expanded="langOpen"
            @click="langOpen = !langOpen"
          >
            <span :lang="currentLocale.htmlLang">{{ currentLocale.short }}</span>
            <span class="lang-caret" aria-hidden="true">⌄</span>
          </button>
          <div role="group" :aria-label="t('common.language')" class="lang-options">
            <button
              v-for="l in locales"
              :key="l.code"
              type="button"
              class="lang-btn"
              :lang="l.htmlLang"
              :aria-pressed="locale === l.code"
              @click="chooseLocale(l.code)"
            >
              {{ l.short }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="menu-btn"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? t('common.closeMenu') : t('common.openMenu')"
          @click="menuOpen = !menuOpen"
        >
          <svg v-if="!menuOpen" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(241, 224, 206, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  min-height: 76px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: 22px;
  white-space: nowrap;
}
.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 26px;
  font-weight: 500;
}
.nav-link {
  text-decoration: none;
  padding: 8px 0;
  white-space: nowrap;
}
.nav-link[aria-current="page"] {
  font-weight: 900;
  box-shadow: inset 0 -3px 0 var(--coral);
}
.tools {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lang {
  position: relative;
  display: flex;
  background: var(--white);
  border-radius: 999px;
  padding: 4px;
  gap: 2px;
}
.lang-current {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 54px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: var(--ink);
  color: var(--cream);
  font-weight: 700;
  cursor: pointer;
}
.lang-caret {
  font-size: 14px;
  line-height: 1;
  transition: transform 0.2s ease;
}
.lang.open .lang-caret,
.lang:hover .lang-caret,
.lang:focus-within .lang-caret {
  transform: rotate(180deg);
}
.lang-options {
  position: absolute;
  top: 50%;
  right: 4px;
  display: flex;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: var(--white);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) scaleX(0.68);
  transform-origin: right center;
  transition: opacity 0.18s ease, transform 0.18s ease;
  box-shadow: 0 8px 24px rgba(45, 36, 32, 0.12);
}
.lang.open .lang-options,
.lang:hover .lang-options,
.lang:focus-within .lang-options {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) scaleX(1);
}
.lang-btn {
  min-width: 40px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}
.lang-btn[aria-pressed="true"] {
  background: var(--ink);
  color: var(--cream);
  font-weight: 700;
}
.menu-btn {
  display: none;
  width: 44px;
  height: 44px;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: transparent;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

@media (max-width: 1000px) {
  .menu-btn {
    display: inline-flex;
  }
  .nav {
    display: none;
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    flex-direction: column;
    gap: 0;
    padding: 8px var(--gutter) 20px;
    background: var(--cream);
    border-bottom: 2px solid var(--ink);
    font-size: 20px;
    font-weight: 700;
  }
  .nav.open {
    display: flex;
  }
  .nav-link {
    padding: 14px 0;
    border-bottom: 1px solid var(--line);
  }
  .nav-link[aria-current="page"] {
    box-shadow: none;
    color: var(--accent-text);
  }
}
@media (max-width: 520px) {
  .brand {
    font-size: 18px;
    gap: 8px;
  }
  .brand :deep(.brand-mark) {
    width: 30px;
    height: 30px;
  }
  .lang-current {
    min-width: 44px;
    height: 32px;
    font-size: 14px;
  }
  .lang-btn {
    min-width: 32px;
    height: 32px;
    font-size: 14px;
  }
  .bar {
    min-height: 64px;
    gap: 8px;
  }
  .menu-btn {
    width: 40px;
    height: 40px;
  }
  .brand {
    min-width: 0;
  }
  .brand > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tools {
    gap: 6px;
    flex: none;
  }
}
@media (max-width: 400px) {
  .brand {
    font-size: 16px;
  }
  .lang {
    padding: 3px;
    gap: 0;
  }
  .lang-current {
    min-width: 40px;
    height: 30px;
    font-size: 13px;
  }
  .lang-btn {
    min-width: 28px;
    height: 30px;
    font-size: 13px;
  }
  .menu-btn {
    width: 36px;
    height: 36px;
  }
}
@media (max-width: 340px) {
  .brand > span {
    display: none;
  }
}
</style>
