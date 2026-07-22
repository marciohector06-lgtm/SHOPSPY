import type { Page } from "puppeteer";
import puppeteer from "puppeteer";
import type { Category } from "@shopspy/shared";
import { pickUserAgent } from "../shared/userAgents";
import { RateLimiter, SOURCE_MIN_DELAY_MS } from "../shared/rateLimiter";
import { CATEGORY_SEARCH_TERMS } from "../shared/categoryMap";
import { upsertProductFromBR } from "../shared/upsert";
import { withScraperLog } from "../shared/runLog";
import type { ParsedBRProduct, ScraperRunResult } from "../shared/types";

const STOREFRONT_BASE = "https://www.tiktok.com/shop/browse";

/**
 * Shape bruto extraído do DOM público da vitrine do TikTok Shop
 * (via page.evaluate). Sem login — a área de afiliado exigiria
 * autenticação, então usamos a vitrine pública, como acordado.
 */
export interface RawTikTokShopCard {
  id: string;
  title: string;
  priceText: string; // ex: "R$ 49,90"
  soldText?: string; // ex: "1,2 mil vendidos"
  imageUrl?: string;
}

function parsePriceBR(priceText: string): number | undefined {
  const match = priceText.replace(/\./g, "").match(/(\d+),(\d{2})/);
  if (!match) return undefined;
  return Number(`${match[1]}.${match[2]}`);
}

function parseSoldCount(soldText: string | undefined): number | undefined {
  if (!soldText) return undefined;
  const milMatch = soldText.match(/([\d,.]+)\s*mil/i);
  if (milMatch) {
    return Math.round(Number(milMatch[1]!.replace(",", ".")) * 1000);
  }
  const plain = soldText.match(/[\d.]+/);
  return plain ? Number(plain[0].replace(/\./g, "")) : undefined;
}

/**
 * Pura: converte um card bruto extraído da vitrine pública em ParsedBRProduct.
 * Comissão não é exposta na vitrine pública (só no painel de afiliado
 * autenticado) — fica undefined aqui, igual à Shopee.
 */
export function normalizeTikTokShopCard(
  card: RawTikTokShopCard,
  category: Category
): ParsedBRProduct {
  return {
    name: card.title,
    category,
    imageUrl: card.imageUrl,
    platform: "tiktokShop",
    externalId: card.id,
    priceBR: parsePriceBR(card.priceText),
    soldCountBR: parseSoldCount(card.soldText),
  };
}

/** I/O real: abre a vitrine pública e extrai os cards visíveis. Requer Chromium instalado. */
async function extractCardsFromStorefront(page: Page, term: string): Promise<RawTikTokShopCard[]> {
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

export async function runTikTokShopBRScraper(): Promise<ScraperRunResult> {
  return withScraperLog("TIKTOK_SHOP_BR", "BR", async () => {
    const limiter = new RateLimiter(SOURCE_MIN_DELAY_MS.TIKTOK_SHOP_BR);
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
        for (const term of CATEGORY_SEARCH_TERMS[category]) {
          try {
            await limiter.wait();
            const cards = await extractCardsFromStorefront(page, term);
            const items = cards
              .filter((c) => c.title)
              .map((c) => normalizeTikTokShopCard(c, category));

            itemsFound += items.length;
            for (const item of items) {
              const { created } = await upsertProductFromBR(item);
              if (created) itemsNew++;
              else itemsUpdated++;
            }
          } catch (error) {
            errors.push(
              `${category}/${term}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }
    } finally {
      await browser.close();
    }

    return { itemsFound, itemsNew, itemsUpdated, errors };
  });
}
