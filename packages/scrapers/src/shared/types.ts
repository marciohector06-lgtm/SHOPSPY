import type { Category } from "@shopspy/shared";

export type BRPlatform = "shopee" | "tiktokShop" | "mercadoLivre";

/** Formato normalizado que todo scraper BR retorna, antes do upsert no Product. */
export interface ParsedBRProduct {
  name: string;
  category: Category;
  imageUrl?: string;
  platform: BRPlatform;
  externalId: string;

  priceBR?: number;
  commissionPctBR?: number;
  commissionValueBR?: number;
  soldCountBR?: number;
  ratingBR?: number;
  searchesBR?: number;
  creatorVideosBR?: number;
}

export interface ScraperRunResult {
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
  errors: string[];
}

export type GlobalPlatform = "tiktokCreative" | "tiktokShopUS" | "amazonUS" | "amazonUK" | "aliexpress";
export type GlobalRegion = "US" | "UK" | "AU" | "CA";

/**
 * Formato normalizado que todo scraper global retorna, antes do upsert.
 * A tradução PT-BR e o match com produtos BR (ProductMatch) ficam para a
 * Fase 4/5 (dependem do Gemini) — aqui só populamos o lado global do Product.
 */
export interface ParsedGlobalProduct {
  name: string; // nome em inglês, como vem da fonte
  category: Category;
  imageUrl?: string;
  platform: GlobalPlatform;
  region: GlobalRegion;
  externalId: string;

  priceUS?: number;
  soldCountUS?: number;
  amazonRankUS?: number;
  amazonRankUK?: number;
  tiktokImpressions?: number;
  tiktokCTR?: number;
  videoUrls?: string[];
}
