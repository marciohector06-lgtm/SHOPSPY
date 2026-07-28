import type { Category } from "@shopspy/shared";

/**
 * Slugs das raízes de Best Sellers da Amazon por categoria. Categorias sem
 * um node 1:1 reaproveitam o node mais próximo (ex.: MAKEUP e HAIR_CARE
 * caem em "beauty"). "OTHER" não tem um Best Sellers correspondente e é
 * pulada pelo scraper.
 */
export const AMAZON_BESTSELLERS_SLUGS: Partial<Record<Category, string>> = {
  BEAUTY_SKINCARE: "Best-Sellers-Beauty/zgbs/beauty",
  MAKEUP: "Best-Sellers-Beauty/zgbs/beauty",
  HAIR_CARE: "Best-Sellers-Beauty/zgbs/beauty",
  FASHION_WOMEN: "Best-Sellers-Clothing-Shoes-Jewelry/zgbs/fashion",
  FASHION_MEN: "Best-Sellers-Clothing-Shoes-Jewelry/zgbs/fashion",
  ACCESSORIES: "Best-Sellers-Clothing-Shoes-Jewelry/zgbs/fashion",
  HOME_CLEANING: "Best-Sellers-Home-Kitchen/zgbs/home-garden",
  HOME_ORGANIZATION: "Best-Sellers-Home-Kitchen/zgbs/home-garden",
  HOME_DECOR: "Best-Sellers-Home-Kitchen/zgbs/home-garden",
  KITCHEN: "Best-Sellers-Kitchen-Dining/zgbs/kitchen",
  FITNESS: "Best-Sellers-Sports-Outdoors/zgbs/sporting-goods",
  ELECTRONICS_GADGETS: "Best-Sellers-Electronics/zgbs/electronics",
  SUPPLEMENTS: "Best-Sellers-Health-Personal-Care/zgbs/hpc",
  PETS: "Best-Sellers-Pet-Supplies/zgbs/pet-supplies",
};

export interface AmazonSlugGroup {
  slug: string;
  /** Categoria "dona" do node — primeira categoria de AMAZON_BESTSELLERS_SLUGS mapeada pra esse slug. */
  ownerCategory: Category;
}

/**
 * Agrupa AMAZON_BESTSELLERS_SLUGS por slug único. Vários node de Best
 * Sellers da Amazon são compartilhados por mais de uma Category (ex.:
 * BEAUTY_SKINCARE/MAKEUP/HAIR_CARE caem todos em "beauty") — buscar e
 * gravar o mesmo HTML uma vez por Category faria o mesmo produto virar
 * uma linha por categoria (upsertProductFromGlobal dedupa por
 * (nameNormalized, category), então categorias diferentes não colidem).
 * Os scrapers da Amazon (US/UK) devem iterar esse resultado — um fetch +
 * parse + upsert por slug único — em vez de Object.keys(AMAZON_BESTSELLERS_SLUGS).
 */
export function groupCategoriesBySlug(): AmazonSlugGroup[] {
  const bySlug = new Map<string, Category>();
  for (const [category, slug] of Object.entries(AMAZON_BESTSELLERS_SLUGS) as Array<[Category, string]>) {
    if (!bySlug.has(slug)) {
      bySlug.set(slug, category);
    }
  }
  return [...bySlug.entries()].map(([slug, ownerCategory]) => ({ slug, ownerCategory }));
}
