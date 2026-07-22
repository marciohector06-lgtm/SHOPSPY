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
