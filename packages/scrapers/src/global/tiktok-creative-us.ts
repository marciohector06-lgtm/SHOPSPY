import type { Page } from "puppeteer";
import puppeteer from "puppeteer";
import type { Category } from "@shopspy/shared";
import { pickUserAgent } from "../shared/userAgents";
import { RateLimiter } from "../shared/rateLimiter";
import { upsertProductFromGlobal } from "../shared/upsert";
import { withScraperLog } from "../shared/runLog";
import type { GlobalRegion, ParsedGlobalProduct, ScraperRunResult } from "../shared/types";

const STOREFRONT_BASE = "https://ads.tiktok.com/business/creativecenter/top-products/pc/en";
// UK e AU importam porque tendências de moda/beleza costumam chegar ao Brasil
// via essas regiões ~2 semanas antes dos EUA (geo passado ao Creative Center).
const REGIONS: Array<{ region: GlobalRegion; geo: string }> = [
  { region: "US", geo: "US" },
  { region: "UK", geo: "GB" },
  { region: "AU", geo: "AU" },
];
const MIN_DELAY_MS = 3000;

export interface RawCreativeCenterCard {
  id: string;
  title: string;
  industryLabel: string;
  impressionsText: string; // ex: "1.2M"
  ctrText?: string; // ex: "3.45%"
  thumbnailUrl?: string;
  videoUrls: string[];
}

const INDUSTRY_KEYWORDS: Record<Category, string[]> = {
  BEAUTY_SKINCARE: ["beauty", "skincare", "skin care", "personal care"],
  MAKEUP: ["makeup", "cosmetic"],
  HAIR_CARE: ["hair"],
  FASHION_WOMEN: ["women's fashion", "womenswear", "dresses"],
  FASHION_MEN: ["men's fashion", "menswear"],
  ACCESSORIES: ["jewelry", "accessor", "eyewear"],
  HOME_CLEANING: ["cleaning", "household"],
  HOME_ORGANIZATION: ["organization", "storage"],
  HOME_DECOR: ["home decor", "home & living", "decor"],
  KITCHEN: ["kitchen", "cookware"],
  FITNESS: ["fitness", "sports", "exercise"],
  ELECTRONICS_GADGETS: ["electronics", "gadget", "phone accessor"],
  SUPPLEMENTS: ["supplement", "vitamin", "health"],
  PETS: ["pet"],
  OTHER: [],
};

/** Pura: mapeia o rótulo de indústria do Creative Center para o nosso enum Category. */
export function mapIndustryToCategory(industryLabel: string): Category {
  const normalized = industryLabel.toLowerCase();
  for (const [category, keywords] of Object.entries(INDUSTRY_KEYWORDS) as Array<
    [Category, string[]]
  >) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }
  return "OTHER";
}

function parseImpressions(text: string): number | undefined {
  const match = text.trim().match(/^([\d.]+)\s*([KMB]?)$/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[match[2]?.toUpperCase() ?? ""] ?? 1;
  return Math.round(value * multiplier);
}

function parseCTR(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const match = text.match(/([\d.]+)\s*%/);
  return match ? Number(match[1]) : undefined;
}

/** Pura: converte um card bruto do Creative Center em ParsedGlobalProduct. */
export function normalizeCreativeCenterCard(
  card: RawCreativeCenterCard,
  region: GlobalRegion
): ParsedGlobalProduct {
  return {
    name: card.title,
    category: mapIndustryToCategory(card.industryLabel),
    imageUrl: card.thumbnailUrl,
    platform: "tiktokCreative",
    region,
    externalId: card.id,
    tiktokImpressions: parseImpressions(card.impressionsText),
    tiktokCTR: parseCTR(card.ctrText),
    videoUrls: card.videoUrls,
  };
}

/** I/O real: abre o Creative Center público (sem login) e extrai os top produtos da região. */
async function extractTopProducts(page: Page, geo: string): Promise<RawCreativeCenterCard[]> {
  await page.goto(`${STOREFRONT_BASE}?region=${geo}&period=7`, {
    waitUntil: "networkidle2",
    timeout: 25_000,
  });

  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("[data-testid='product-card']"));
    return cards.map((card) => ({
      id: card.getAttribute("data-product-id") ?? crypto.randomUUID(),
      title: card.querySelector("[data-testid='product-title']")?.textContent?.trim() ?? "",
      industryLabel: card.querySelector("[data-testid='product-industry']")?.textContent?.trim() ?? "",
      impressionsText: card.querySelector("[data-testid='product-impressions']")?.textContent?.trim() ?? "",
      ctrText: card.querySelector("[data-testid='product-ctr']")?.textContent?.trim(),
      thumbnailUrl: card.querySelector("img")?.getAttribute("src") ?? undefined,
      videoUrls: Array.from(card.querySelectorAll("a[href*='/video/']"))
        .slice(0, 3)
        .map((a) => a.getAttribute("href") ?? "")
        .filter(Boolean),
    }));
  });
}

export async function runTikTokCreativeCenterScraper(): Promise<ScraperRunResult> {
  return withScraperLog("TIKTOK_CREATIVE_US", "GLOBAL", async () => {
    const limiter = new RateLimiter(MIN_DELAY_MS);
    let itemsFound = 0;
    let itemsNew = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(pickUserAgent());

      for (const { region, geo } of REGIONS) {
        try {
          await limiter.wait();
          const cards = await extractTopProducts(page, geo);
          const items = cards.filter((c) => c.title).map((c) => normalizeCreativeCenterCard(c, region));

          itemsFound += items.length;
          for (const item of items) {
            const { created } = await upsertProductFromGlobal(item);
            if (created) itemsNew++;
            else itemsUpdated++;
          }
        } catch (error) {
          errors.push(`${region}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } finally {
      await browser.close();
    }

    return { itemsFound, itemsNew, itemsUpdated, errors };
  });
}
