export default defineNuxtConfig({
  compatibilityDate: "2026-01-01",
  devtools: { enabled: true },
  typescript: {
    strict: true,
    typeCheck: false,
  },

  css: ["~/assets/css/main.css"],

  // 前端一律呼叫同源的 /api，由 dev server 轉給後端；這樣 localhost 與
  // flight.bru-bus.com（經 Caddy）都能用。後端位址可用 BACKEND_PROXY_TARGET 覆寫。
  nitro: {
    devProxy: {
      "/api": {
        target: process.env.BACKEND_PROXY_TARGET || "http://127.0.0.1:3011/api",
        changeOrigin: true,
      },
    },
  },

  // 經由 Caddy 用 flight.bru-bus.com 連進來時，Vite 會擋不認得的 Host。
  vite: {
    server: { allowedHosts: [".bru-bus.com"] },
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
