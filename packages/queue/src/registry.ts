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
  type ScraperRunResult,
} from "@shopspy/scrapers";
import { runAlertChecker } from "./alertChecker";

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
};

export function isKnownSource(source: string): boolean {
  return source in SCRAPER_RUNNERS;
}
