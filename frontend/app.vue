<script setup lang="ts">
const { t, htmlLang, restoreLocale } = useI18n();

useHead({
  htmlAttrs: { lang: htmlLang },
  titleTemplate: (title) => (title ? `${title} · ${t("common.brand")}` : t("common.brand")),
});

onMounted(restoreLocale);
</script>

<template>
  <div class="site">
    <SiteHeader />
    <main id="main">
      <NuxtPage />
    </main>
    <SiteFooter />
  </div>
</template>
