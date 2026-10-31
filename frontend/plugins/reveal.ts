/**
 * v-reveal：區塊捲進畫面時淡入上移。只在瀏覽器且使用者沒有開「減少動態」時啟用；
 * 沒有 JS 或不支援 IntersectionObserver 時內容一律直接顯示。
 */
export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | null = null;

  const enabled =
    import.meta.client &&
    "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (enabled) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
  }

  nuxtApp.vueApp.directive("reveal", {
    getSSRProps: () => ({}),
    mounted(el: HTMLElement, binding) {
      if (!observer) return;
      el.classList.add("reveal");
      if (binding.value) el.style.transitionDelay = `${binding.value}s`;
      observer.observe(el);
    },
    unmounted(el: HTMLElement) {
      observer?.unobserve(el);
    },
  });
});
