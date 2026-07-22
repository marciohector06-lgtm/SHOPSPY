// Espelham os enums do Prisma (packages/database/prisma/schema.prisma).
// Duplicados aqui de propósito: apps/web não deve depender de @prisma/client
// no bundle do browser.

export const CATEGORIES = [
  "BEAUTY_SKINCARE",
  "MAKEUP",
  "HAIR_CARE",
  "FASHION_WOMEN",
  "FASHION_MEN",
  "ACCESSORIES",
  "HOME_CLEANING",
  "HOME_ORGANIZATION",
  "HOME_DECOR",
  "KITCHEN",
  "FITNESS",
  "ELECTRONICS_GADGETS",
  "SUPPLEMENTS",
  "PETS",
  "OTHER",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRODUCT_STATUSES = [
  "MONITORING",
  "OPPORTUNITY",
  "TRENDING_BR",
  "SATURATED",
  "ARCHIVED",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SCORE_CLASSES = [
  "MAXIMUM",
  "HIGH",
  "MEDIUM",
  "SATURATING",
  "AVOID",
] as const;
export type ScoreClass = (typeof SCORE_CLASSES)[number];

export const SCRAPER_SOURCES = [
  "GOOGLE_TRENDS_BR",
  "GOOGLE_TRENDS_US",
  "GOOGLE_TRENDS_UK",
  "SHOPEE_BR",
  "TIKTOK_SHOP_BR",
  "MERCADOLIVRE_BR",
  "TIKTOK_CREATIVE_US",
  "TIKTOK_SHOP_US",
  "AMAZON_US",
  "AMAZON_UK",
  "ALIEXPRESS_GLOBAL",
  "VIDEOS_US",
  "VIDEOS_BR",
] as const;
export type ScraperSource = (typeof SCRAPER_SOURCES)[number];

export const PLANS = ["FREE", "PRO"] as const;
export type Plan = (typeof PLANS)[number];

export const ALERT_CHANNELS = ["email", "whatsapp", "push"] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export interface ExternalIds {
  shopee?: string;
  tiktokShop?: string;
  mercadoLivre?: string;
  tiktokCreative?: string;
  tiktokShopUS?: string;
  amazonUS?: string;
  amazonUK?: string;
  aliexpress?: string;
}
