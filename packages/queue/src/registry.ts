import {
  runShopeeBRScraper,
  runTikTokShopBRScraper,
  runMercadoLivreBRScraper,
  runGoogleTrendsBRScraper,
  runTikTokCreativeCenterScraper,
  runTikTokShopUSScraper,
  runAmazonUSScraper,
  runAmazonUKScraper,
  runAliExpressGlobalScraper,
  runGoogleTrendsGlobalScraper,
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
  runGoogleTrendsInternationalScraper,
  matchProductsWithBR,
  type ScraperRunResult,
} from "@shopspy/scrapers";
import { runAlertChecker } from "./alertChecker";
import { runScoreCalculator } from "./scoreCalculator";
import { runExplosiveAlertChecker } from "./explosiveAlertChecker";
import { runSubcategoryClassifier } from "./subcategoryClassifier";

export type ScraperRunner = () => Promise<ScraperRunResult>;

const NOT_IMPLEMENTED = (source: string): ScraperRunner => async () => ({
  itemsFound: 0,
  itemsNew: 0,
  itemsUpdated: 0,
  errors: [`${source}: scraper ainda não implementado (Fase 3 não cobriu vídeos de referência)`],
});

/**
 * Registro central: fonte -> função que executa o scraper. Usado tanto
 * pelo worker do cron quanto pelo endpoint de disparo manual, pra não ter
 * duas listas divergentes de "quais fontes existem".
 */
export const SCRAPER_RUNNERS: Record<string, ScraperRunner> = {
  SHOPEE_BR: runShopeeBRScraper,
  TIKTOK_SHOP_BR: runTikTokShopBRScraper,
  MERCADOLIVRE_BR: runMercadoLivreBRScraper,
  GOOGLE_TRENDS_BR: runGoogleTrendsBRScraper,
  TIKTOK_CREATIVE_US: runTikTokCreativeCenterScraper,
  TIKTOK_SHOP_US: runTikTokShopUSScraper,
  AMAZON_US: runAmazonUSScraper,
  AMAZON_UK: runAmazonUKScraper,
  ALIEXPRESS_GLOBAL: runAliExpressGlobalScraper,
  GOOGLE_TRENDS_US: runGoogleTrendsGlobalScraper, // trends global combinado (decisão da Fase 3)
  VIDEOS_US: NOT_IMPLEMENTED("VIDEOS_US"),
  VIDEOS_BR: NOT_IMPLEMENTED("VIDEOS_BR"),
  ALERT_CHECKER: runAlertChecker,
  SCORE_CALCULATOR: runScoreCalculator,
  // TikTok Creative Center internacional (packages/scrapers/src/global/tiktok-creative-international.ts).
  TIKTOK_CREATIVE_MX: runTikTokCreativeMXScraper,
  TIKTOK_CREATIVE_CO: runTikTokCreativeCOScraper,
  TIKTOK_CREATIVE_AR: runTikTokCreativeARScraper,
  TIKTOK_CREATIVE_CL: runTikTokCreativeCLScraper,
  TIKTOK_CREATIVE_TH: runTikTokCreativeTHScraper,
  TIKTOK_CREATIVE_ID: runTikTokCreativeIDScraper,
  TIKTOK_CREATIVE_VN: runTikTokCreativeVNScraper,
  TIKTOK_CREATIVE_JP: runTikTokCreativeJPScraper,
  TIKTOK_CREATIVE_FR: runTikTokCreativeFRScraper,
  TIKTOK_CREATIVE_DE: runTikTokCreativeDEScraper,
  TIKTOK_CREATIVE_IT: runTikTokCreativeITScraper,
  GOOGLE_TRENDS_INTERNATIONAL: runGoogleTrendsInternationalScraper,
  EXPLOSIVE_DETECTOR: runExplosiveAlertChecker,
  BR_MATCHER: matchProductsWithBR,
  SUBCATEGORY_CLASSIFIER: runSubcategoryClassifier,
};

export function isKnownSource(source: string): boolean {
  return source in SCRAPER_RUNNERS;
}
