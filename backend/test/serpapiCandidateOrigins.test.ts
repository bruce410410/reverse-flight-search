import { describe, it, expect } from "vitest";
import {
  DEFAULT_CANDIDATE_ORIGIN_AIRPORTS,
  chunkOrigins,
  resolveCandidateOrigins,
} from "../src/serpapi/candidateOrigins.js";

describe("SerpApi candidateOrigins", () => {
  it("沒有覆寫時使用預設 14 個機場", () => {
    expect(resolveCandidateOrigins("")).toBe(DEFAULT_CANDIDATE_ORIGIN_AIRPORTS);
    expect(DEFAULT_CANDIDATE_ORIGIN_AIRPORTS).toHaveLength(14);
  });

  it("覆寫清單會正規化大小寫，未知代碼也保留", () => {
    const result = resolveCandidateOrigins(" nrt, ZZZ ,");
    expect(result.map((a) => a.iata)).toEqual(["NRT", "ZZZ"]);
    expect(result[0]!.city).toBe("Tokyo");
    expect(result[1]!.city).toBe("ZZZ");
  });

  it("依批次大小切分，預設清單切成 2 批（每次搜尋 2 次請求）", () => {
    expect(chunkOrigins(DEFAULT_CANDIDATE_ORIGIN_AIRPORTS, 7)).toHaveLength(2);
    expect(chunkOrigins([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
