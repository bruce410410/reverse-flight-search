import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須是 YYYY-MM-DD");

/**
 * 反向搜票請求的輸入驗證。
 *
 * Edge cases 涵蓋：
 *  - 目的地代碼格式錯誤
 *  - 日期格式錯誤、dateFrom 晚於 dateTo、日期在過去
 *  - round-trip 卻缺少回程日期，或回程日期早於去程區間
 *  - maxResults 超出合理範圍（避免一次要求過大結果集打爆 Kiwi API 額度）
 */
export const reverseSearchRequestSchema = z
  .object({
    destination: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "destination 必須是 3 碼 IATA 機場代碼")
      .transform((v) => v.toUpperCase()),
    dateFrom: isoDate,
    dateTo: isoDate,
    tripType: z.enum(["one-way", "round-trip"]).default("one-way"),
    returnDateFrom: isoDate.optional(),
    returnDateTo: isoDate.optional(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "currency 必須是 3 碼 ISO 4217 代碼")
      .transform((v) => v.toUpperCase())
      .default("TWD"),
    maxResults: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((data, ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateFrom = new Date(data.dateFrom);
    const dateTo = new Date(data.dateTo);

    if (dateFrom < today) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateFrom"], message: "dateFrom 不能是過去的日期" });
    }
    if (dateTo < dateFrom) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateTo"], message: "dateTo 不能早於 dateFrom" });
    }

    if (data.tripType === "round-trip") {
      if (!data.returnDateFrom || !data.returnDateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDateFrom"],
          message: "round-trip 查詢必須提供 returnDateFrom 與 returnDateTo",
        });
        return;
      }
      const returnFrom = new Date(data.returnDateFrom);
      const returnTo = new Date(data.returnDateTo);

      if (returnFrom < dateTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDateFrom"],
          message: "returnDateFrom 不能早於去程日期範圍的 dateTo",
        });
      }
      if (returnTo < returnFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDateTo"],
          message: "returnDateTo 不能早於 returnDateFrom",
        });
      }
    }
  });

export type ReverseSearchRequestBody = z.infer<typeof reverseSearchRequestSchema>;
