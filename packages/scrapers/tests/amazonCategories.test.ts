import { describe, expect, it } from "vitest";
import { AMAZON_BESTSELLERS_SLUGS, groupCategoriesBySlug } from "../src/shared/amazonCategories";

describe("groupCategoriesBySlug", () => {
  it("agrupa as 14 categorias mapeadas em 8 slugs únicos", () => {
    const groups = groupCategoriesBySlug();
    const uniqueSlugs = new Set(Object.values(AMAZON_BESTSELLERS_SLUGS));
    expect(groups).toHaveLength(uniqueSlugs.size);
    expect(groups).toHaveLength(8);
  });

  it("usa a primeira categoria de AMAZON_BESTSELLERS_SLUGS como dona de cada slug compartilhado", () => {
    const groups = groupCategoriesBySlug();
    const bySlug = new Map(groups.map((g) => [g.slug, g.ownerCategory]));

    expect(bySlug.get("Best-Sellers-Beauty/zgbs/beauty")).toBe("BEAUTY_SKINCARE");
    expect(bySlug.get("Best-Sellers-Clothing-Shoes-Jewelry/zgbs/fashion")).toBe("FASHION_WOMEN");
    expect(bySlug.get("Best-Sellers-Home-Kitchen/zgbs/home-garden")).toBe("HOME_CLEANING");
  });

  it("mantém as categorias com slug exclusivo como donas do próprio slug", () => {
    const groups = groupCategoriesBySlug();
    const bySlug = new Map(groups.map((g) => [g.slug, g.ownerCategory]));

    expect(bySlug.get("Best-Sellers-Kitchen-Dining/zgbs/kitchen")).toBe("KITCHEN");
    expect(bySlug.get("Best-Sellers-Sports-Outdoors/zgbs/sporting-goods")).toBe("FITNESS");
    expect(bySlug.get("Best-Sellers-Electronics/zgbs/electronics")).toBe("ELECTRONICS_GADGETS");
    expect(bySlug.get("Best-Sellers-Health-Personal-Care/zgbs/hpc")).toBe("SUPPLEMENTS");
    expect(bySlug.get("Best-Sellers-Pet-Supplies/zgbs/pet-supplies")).toBe("PETS");
  });

  it("não repete nenhum slug entre os grupos", () => {
    const groups = groupCategoriesBySlug();
    const slugs = groups.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
