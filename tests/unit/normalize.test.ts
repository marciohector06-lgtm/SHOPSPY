import { describe, expect, it } from "vitest";
import { normalizeProductName } from "@shopspy/shared";

describe("normalizeProductName", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeProductName("Depiladora Elétrica")).toBe("depiladora eletrica");
  });

  it("removes emojis", () => {
    expect(normalizeProductName("Escova Alisadora 🔥🔥")).toBe("escova alisadora");
  });

  it("collapses extra whitespace and punctuation", () => {
    expect(normalizeProductName("  Mini   Massageador!! ")).toBe("mini massageador");
  });

  it("produces the same key for near-duplicate names across sources", () => {
    const shopeeName = "Kit Skincare Facial - 5 peças";
    const tiktokName = "kit  skincare facial 5 PEÇAS";
    expect(normalizeProductName(shopeeName)).toBe(normalizeProductName(tiktokName));
  });
});
