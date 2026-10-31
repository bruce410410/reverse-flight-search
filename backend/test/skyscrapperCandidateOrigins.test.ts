import { describe, it, expect } from "vitest";
import { DEFAULT_CANDIDATE_ORIGIN_AIRPORTS, resolveCandidateOrigins } from "../src/skyscrapper/candidateOrigins.js";

describe("skyscrapper candidateOrigins", () => {
  it("預設清單沒有重複的機場代碼", () => {
    const codes = DEFAULT_CANDIDATE_ORIGIN_AIRPORTS.map((a) => a.iata);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("預設清單每個機場代碼都是 3 碼大寫字母", () => {
    for (const airport of DEFAULT_CANDIDATE_ORIGIN_AIRPORTS) {
      expect(airport.iata).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("預設清單縮小為 6 個機場（免費額度每月實際 50 次的考量，見 candidateOrigins.ts 檔頭註解）", () => {
    expect(DEFAULT_CANDIDATE_ORIGIN_AIRPORTS.length).toBe(6);
  });

  it("空字串覆寫時回傳預設清單", () => {
    expect(resolveCandidateOrigins("")).toBe(DEFAULT_CANDIDATE_ORIGIN_AIRPORTS);
  });

  it("用逗號分隔的代碼覆寫，並保留對照表裡的城市/國家名稱", () => {
    expect(resolveCandidateOrigins("nrt, sin")).toEqual([
      { iata: "NRT", city: "Tokyo", country: "Japan" },
      { iata: "SIN", city: "Singapore", country: "Singapore" },
    ]);
  });

  it("覆寫值不在對照表裡時，city/country 留空字串而不是報錯", () => {
    expect(resolveCandidateOrigins("XYZ")).toEqual([{ iata: "XYZ", city: "XYZ", country: "" }]);
  });
});
