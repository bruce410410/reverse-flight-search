import { LOCALES, interpolate, lookup, type Locale, type Messages } from "~/i18n";
import { zh } from "~/i18n/zh";
import { en } from "~/i18n/en";
import { ja } from "~/i18n/ja";
import { ko } from "~/i18n/ko";

const MESSAGES: Record<Locale, Messages> = { zh, en, ja, ko };
const STORAGE_KEY = "smart-traveler:locale";

/**
 * 輕量的四語切換（中／英／日／韓）。語系存在 localStorage，伺服器端一律先以中文渲染，
 * 進到瀏覽器後再換成使用者上次選的語言。找不到的 key 會退回中文，避免畫面出現空白。
 */
export function useI18n() {
  const locale = useState<Locale>("locale", () => "zh");

  function t(path: string, params?: Record<string, string | number>): string {
    const value = lookup(MESSAGES[locale.value], path) ?? lookup(MESSAGES.zh, path);
    return typeof value === "string" ? interpolate(value, params) : path;
  }

  /** 取陣列等非字串的值（例如輪播文字、比較表）。 */
  function tm<T = unknown>(path: string): T {
    return (lookup(MESSAGES[locale.value], path) ?? lookup(MESSAGES.zh, path)) as T;
  }

  function setLocale(next: Locale) {
    locale.value = next;
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 私密瀏覽等情況寫不進 localStorage，只影響下次開啟的預設語言。
      }
    }
  }

  function restoreLocale() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && saved in MESSAGES) locale.value = saved;
    } catch {
      // 讀不到就維持中文。
    }
  }

  const htmlLang = computed(() => LOCALES.find((l) => l.code === locale.value)?.htmlLang ?? "zh-Hant");

  return { locale, t, tm, setLocale, restoreLocale, htmlLang, locales: LOCALES };
}
