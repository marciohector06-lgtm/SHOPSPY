export { runShopeeBRScraper, parseShopeeResponse } from "./brazil/shopee-br";
export { runTikTokShopBRScraper, normalizeTikTokShopCard } from "./brazil/tiktok-shop-br";
export { runMercadoLivreBRScraper, parseMercadoLivreResponse } from "./brazil/mercadolivre-br";
export { runGoogleTrendsBRScraper } from "./brazil/google-trends-br";

export {
  runTikTokCreativeCenterScraper,
  normalizeCreativeCenterCard,
  mapIndustryToCategory,
  scrapeTikTokCreativeRegions,
} from "./global/tiktok-creative-us";
export {
  runTikTokCreativeMXScraper,
  runTikTokCreativeCOScraper,
  runTikTokCreativeARScraper,
  runTikTokCreativeCLScraper,
  runTikTokCreativeTHScraper,
  runTikTokCreativeIDScraper,
  runTikTokCreativeVNScraper,
  runTikTokCreativeJPScraper,
  runTikTokCreativeFRScraper,
  runTikTokCreativeDEScraper,
  runTikTokCreativeITScraper,
} from "./global/tiktok-creative-international";
export { runTikTokShopUSScraper, normalizeTikTokShopUSCard } from "./global/tiktok-shop-us";
export { runAmazonUSScraper } from "./global/amazon-us";
export { runAmazonUKScraper } from "./global/amazon-uk";
export { runAliExpressGlobalScraper, parseAliExpressHotProducts } from "./global/aliexpress-global";
export {
  runGoogleTrendsGlobalScraper,
  computeGlobalTrendsIndex,
  computeGap,
} from "./global/google-trends-global";
export { runGoogleTrendsInternationalScraper } from "./global/google-trends-international";
export { matchProductsWithBR, extractMainKeyword } from "./brazil/br-product-matcher";

export * from "./shared/types";
export * from "./shared/categoryMap";
export * from "./shared/rateLimiter";
export { parseGoogleTrendsResponse, chunkKeywords, type TrendsSummary } from "./shared/trends";
