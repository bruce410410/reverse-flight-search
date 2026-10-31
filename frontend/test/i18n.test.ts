import { describe, expect, it } from "vitest";
import { zh } from "../i18n/zh";
import { en } from "../i18n/en";
import { ja } from "../i18n/ja";
import { ko } from "../i18n/ko";

/** 攤平成 "a.b.c" 路徑；陣列記下長度，確保每個語系的列數一致。 */
function shape(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return [`${prefix}[${value.length}]`, ...value.flatMap((v, i) => shape(v, `${prefix}[${i}]`))];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("i18n", () => {
  const base = shape(zh).sort();
  it.each([
    ["en", en],
    ["ja", ja],
    ["ko", ko],
  ])("%s 跟 zh 有完全相同的 key", (_name, messages) => {
    expect(shape(messages).sort()).toEqual(base);
  });

});
