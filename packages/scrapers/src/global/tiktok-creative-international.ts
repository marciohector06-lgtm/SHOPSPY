import type { ScraperSource } from "@shopspy/shared";
import { scrapeTikTokCreativeRegions } from "./tiktok-creative-us";
import { withScraperLog } from "../shared/runLog";
import type { GlobalRegion, ScraperRunResult } from "../shared/types";

/**
 * TikTok Creative Center para países além de US/UK/AU (packages/scrapers/src/global/tiktok-creative-us.ts).
 * Reaproveita `scrapeTikTokCreativeRegions` — mesma extração/normalização,
 * só muda o geo passado ao Creative Center (a UI é sempre em inglês,
 * `/pc/en?region=${geo}`, então não há mapeamento de categoria por idioma).
 * Cada país é uma ScraperSource própria (fonte de cron/log/trigger manual
 * independente), fase "international" em packages/queue/src/schedules.ts —
 * não faz parte da barreira do ciclo diário BR.
 */
const INTERNATIONAL_CREATIVE_COUNTRIES: Array<{ source: ScraperSource; region: GlobalRegion; geo: string }> = [
  { source: "TIKTOK_CREATIVE_MX", region: "MX", geo: "MX" },
  { source: "TIKTOK_CREATIVE_CO", region: "CO", geo: "CO" },
  { source: "TIKTOK_CREATIVE_AR", region: "AR", geo: "AR" },
  { source: "TIKTOK_CREATIVE_CL", region: "CL", geo: "CL" },
  { source: "TIKTOK_CREATIVE_TH", region: "TH", geo: "TH" },
  { source: "TIKTOK_CREATIVE_ID", region: "ID", geo: "ID" },
  { source: "TIKTOK_CREATIVE_VN", region: "VN", geo: "VN" },
  { source: "TIKTOK_CREATIVE_JP", region: "JP", geo: "JP" },
  { source: "TIKTOK_CREATIVE_FR", region: "FR", geo: "FR" },
  { source: "TIKTOK_CREATIVE_DE", region: "DE", geo: "DE" },
  { source: "TIKTOK_CREATIVE_IT", region: "IT", geo: "IT" },
];

function makeRunner(source: ScraperSource, region: GlobalRegion, geo: string): () => Promise<ScraperRunResult> {
  return () => withScraperLog(source, "GLOBAL", () => scrapeTikTokCreativeRegions([{ region, geo }]));
}

export const runTikTokCreativeMXScraper = makeRunner("TIKTOK_CREATIVE_MX", "MX", "MX");
export const runTikTokCreativeCOScraper = makeRunner("TIKTOK_CREATIVE_CO", "CO", "CO");
export const runTikTokCreativeARScraper = makeRunner("TIKTOK_CREATIVE_AR", "AR", "AR");
export const runTikTokCreativeCLScraper = makeRunner("TIKTOK_CREATIVE_CL", "CL", "CL");
export const runTikTokCreativeTHScraper = makeRunner("TIKTOK_CREATIVE_TH", "TH", "TH");
export const runTikTokCreativeIDScraper = makeRunner("TIKTOK_CREATIVE_ID", "ID", "ID");
export const runTikTokCreativeVNScraper = makeRunner("TIKTOK_CREATIVE_VN", "VN", "VN");
export const runTikTokCreativeJPScraper = makeRunner("TIKTOK_CREATIVE_JP", "JP", "JP");
export const runTikTokCreativeFRScraper = makeRunner("TIKTOK_CREATIVE_FR", "FR", "FR");
export const runTikTokCreativeDEScraper = makeRunner("TIKTOK_CREATIVE_DE", "DE", "DE");
export const runTikTokCreativeITScraper = makeRunner("TIKTOK_CREATIVE_IT", "IT", "IT");

export { INTERNATIONAL_CREATIVE_COUNTRIES };
