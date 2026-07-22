import type { Category } from "@shopspy/shared";
import { fetchJson } from "../shared/http";
import { RateLimiter } from "../shared/rateLimiter";
import { isPathAllowed } from "../shared/robots";
import { cacheGet, cacheSet } from "../shared/cache";
import { AMAZON_BESTSELLERS_SLUGS } from "../shared/amazonCategories";
import { parseAmazonBestSellersHtml } from "../shared/amazon";
import { upsertProductFromGlobal } from "../shared/upsert";
import { withScraperLog } from "../shared/runLog";
import type { ScraperRunResult } from "../shared/types";

const ORIGIN = "https://www.amazon.com";
const MIN_DELAY_MS = 4000; // HTML estático, mas ainda assim conservador

async function fetchCategory(category: Category, limiter: RateLimiter) {
  const slug = AMAZON_BESTSELLERS_SLUGS[category];
  if (!slug) return [];

  const path = `/${slug}`;
  const allowed = await isPathAllowed(ORIGIN, path);
  if (!allowed) {
    throw new Error(`robots.txt bloqueia ${path} — scraper abortado por segurança`);
  }

  const cacheKey = `amazon-us:${slug}`;
  let html = await cacheGet<string>(cacheKey);
  if (!html) {
    await limiter.wait();
    html = await fetchJson<string>(`${ORIGIN}${path}`, {
      responseType: "text",
      headers: { "Accept-Language": "en-US,en;q=0.9" },
    });
    await cacheSet(cacheKey, html, 6 * 60 * 60);
  }

  return parseAmazonBestSellersHtml(html, category, "US");
}

export async function runAmazonUSScraper(): Promise<ScraperRunResult> {
  return withScraperLog("AMAZON_US", "US", async () => {
    const limiter = new RateLimiter(MIN_DELAY_MS);
    const categories = Object.keys(AMAZON_BESTSELLERS_SLUGS) as Category[];

    let itemsFound = 0;
    let itemsNew = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const category of categories) {
      try {
        const items = await fetchCategory(category, limiter);
        itemsFound += items.length;
        for (const item of items) {
          const { created } = await upsertProductFromGlobal(item);
          if (created) itemsNew++;
          else itemsUpdated++;
        }
      } catch (error) {
        errors.push(`${category}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { itemsFound, itemsNew, itemsUpdated, errors };
  });
}
