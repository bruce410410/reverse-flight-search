export default defineNuxtConfig({
  compatibilityDate: "2026-01-01",
  devtools: { enabled: true },
  typescript: {
    strict: true,
    typeCheck: false,
  },

  css: ["~/assets/css/main.css"],

  // 後端 API 位址，可透過環境變數覆寫（例如部署到不同主機時）。
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3011",
    },
  },

  app: {
    head: {
      title: "聰明旅人",
      htmlAttrs: { lang: "zh-Hant" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "description", content: "機票盲搜、路口實景故事板、房間配對的一站式旅遊規劃工具箱" },
        { name: "theme-color", content: "#f1e0ce" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700;900&family=Noto+Sans+KR:wght@400;700;900&family=Noto+Serif+TC:wght@900&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Mono:wght@500;700&family=Zen+Maru+Gothic:wght@700;900&display=swap",
        },
      ],
    },
  },
});
