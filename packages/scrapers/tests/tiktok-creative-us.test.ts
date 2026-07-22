import { describe, expect, it } from "vitest";
import {
  mapIndustryToCategory,
  normalizeCreativeCenterCard,
  type RawCreativeCenterCard,
} from "../src/global/tiktok-creative-us";

describe("mapIndustryToCategory", () => {
  it("mapeia rótulos de beleza/skincare", () => {
    expect(mapIndustryToCategory("Beauty & Personal Care")).toBe("BEAUTY_SKINCARE");
  });

  it("mapeia rótulos de casa e organização", () => {
    expect(mapIndustryToCategory("Home Storage & Organization")).toBe("HOME_ORGANIZATION");
  });

  it("cai em OTHER para rótulos desconhecidos", () => {
    expect(mapIndustryToCategory("Something Completely Unrelated")).toBe("OTHER");
  });
});

describe("normalizeCreativeCenterCard", () => {
  it("converte impressões em K/M/B para número", () => {
    const card: RawCreativeCenterCard = {
      id: "cc-1",
      title: "Portable Blender",
      industryLabel: "Kitchen & Dining",
      impressionsText: "2.4M",
      ctrText: "3.45%",
      videoUrls: ["/video/1", "/video/2"],
    };
    const result = normalizeCreativeCenterCard(card, "US");
    expect(result.tiktokImpressions).toBe(2_400_000);
    expect(result.tiktokCTR).toBe(3.45);
    expect(result.category).toBe("KITCHEN");
    expect(result.region).toBe("US");
    expect(result.platform).toBe("tiktokCreative");
  });

  it("lida com card sem CTR informado", () => {
    const card: RawCreativeCenterCard = {
      id: "cc-2",
      title: "LED Face Mask",
      industryLabel: "Beauty & Personal Care",
      impressionsText: "850K",
      videoUrls: [],
    };
    const result = normalizeCreativeCenterCard(card, "UK");
    expect(result.tiktokImpressions).toBe(850_000);
    expect(result.tiktokCTR).toBeUndefined();
  });
});
