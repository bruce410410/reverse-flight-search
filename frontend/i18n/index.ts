import { zh } from "./zh";

export type Messages = typeof zh;
export type Locale = "zh" | "en" | "ja" | "ko";

export const LOCALES: { code: Locale; short: string; htmlLang: string }[] = [
  { code: "zh", short: "中", htmlLang: "zh-Hant" },
  { code: "en", short: "EN", htmlLang: "en" },
  { code: "ja", short: "日", htmlLang: "ja" },
  { code: "ko", short: "한", htmlLang: "ko" },
];

/** 依 "a.b.c" 路徑取值；找不到回傳 undefined。 */
export function lookup(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, messages);
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
