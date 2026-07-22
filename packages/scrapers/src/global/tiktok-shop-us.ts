import type { Page } from "puppeteer";
import puppeteer from "puppeteer";
import type { Category } from "@shopspy/shared";
import { pickUserAgent } from "../shared/userAgents";
import { RateLimiter } from "../shared/rateLimiter";
import { CATEGORY_SEARCH_TERMS } from "../shared/categoryMap";
import { upsertProductFromGlobal } from "../shared/upsert";
import { withScraperLog } from "../shared/runLog";
import type { ParsedGlobalProduct, ScraperRunResult } from "../shared/types";

const STOREFRONT_BASE = "https://www.tiktok.com/shop/browse";
const MIN_DELAY_MS = 3000;

// Termos de busca em inglês — a vitrine US não entende os termos em PT-BR
// usados pelos scrapers BR.
const CATEGORY_SEARCH_TERMS_EN: Record<Category, string> = {
  BEAUTY_SKINCARE: "facial skincare serum",
  MAKEUP: "makeup foundation",
  HAIR_CARE: "hair straightener",
  FASHION_WOMEN: "women dress",
  FASHION_MEN: "men shirt",
  ACCESSORIES: "jewelry sunglasses",
  HOME_CLEANING: "cleaning gadget",
  HOME_ORGANIZATION: "storage organizer",
  HOME_DECOR: "home decor led",
  KITCHEN: "kitchen gadget",
  FITNESS: "fitness resistance band",
  ELECTRONICS_GADGETS: "electronic gadget",
  SUPPLEMENTS: "vitamin supplement",
  PETS: "pet accessory",
  OTHER: "viral tiktok product",
};

export interface RawTikTokShopUSCard {
  id: string;
  title: string;
  priceText: string; // ex: "$19.99"
  soldText?: string; // ex: "12.3K sold"
  imageUrl?: string;
}

function parsePriceUSD(priceText: string): number | undefined {
  const match = priceText.match(/\$?\s*([\d,]+\.?\d*)/);
  return match ? Number(match[1]!.replace(/,/g, "")) : undefined;
}

function parseSoldCount(soldText: string | undefined): number | undefined {
  if (!soldText) return undefined;
  const kMatch = soldText.match(/([\d.]+)\s*K/i);
  if (kMatch) return Math.round(Number(kMatch[1]) * 1000);
  const plain = soldText.match(/[\d,]+/);
  return plain ? Number(plain[0].replace(/,/g, "")) : undefined;
}

/** Pura: converte um card bruto da vitrine pública US em ParsedGlobalProduct. */
export function normalizeTikTokShopUSCard(
  card: RawTikTokShopUSCard,
  category: Category
): ParsedGlobalProduct {
  return {
    name: card.title,
    category,
    imageUrl: card.imageUrl,
    platform: "tiktokShopUS",
    region: "US",
    externalId: card.id,
    priceUS: parsePriceUSD(card.priceText),
    soldCountUS: parseSoldCount(card.soldText),
  };
}

async function extractCardsFromStorefront(page: Page, term: string): Promise<RawTikTokShopUSCard[]> {
  await page.goto(`${STOREFRONT_BASE}?keyword=${encodeURIComponent(term)}`, {
    waitUntil: "networkidle2",
    timeout: 20_000,
  });

  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("[data-e2e='shop-product-card']"));
    return cards.map((card) => ({
      id: card.getAttribute("data-product-id") ?? crypto.randomUUID(),
      title: card.querySelector("[data-e2e='product-title']")?.textContent?.trim() ?? "",
      priceText: card.querySelector("[data-e2e='product-price']")?.textContent?.trim() ?? "",
      soldText: card.querySelector("[data-e2e='product-sold']")?.textContent?.trim(),
      imageUrl: card.querySelector("img")?.getAttribute("src") ?? undefined,
    }));
  });
}

export async function runTikTokShopUSScraper(): Promise<ScraperRunResult> {
  return withScraperLog("TIKTOK_SHOP_US", "US", async () => {
    const limiter = new RateLimiter(MIN_DELAY_MS);
    const categories = Object.keys(CATEGORY_SEARCH_TERMS) as Category[];

    let itemsFound = 0;
    let itemsNew = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(pickUserAgent());

      for (const category of categories) {
        try {
          await limiter.wait();
          const term = CATEGORY_SEARCH_TERMS_EN[category];
          const cards = await extractCardsFromStorefront(page, term);
          const items = cards
            .filter((c) => c.title)
            .map((c) => normalizeTikTokShopUSCard(c, category));

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
    } finally {
      await browser.close();
    }

    return { itemsFound, itemsNew, itemsUpdated, errors };
  });
}
