import type { Category } from "@shopspy/shared";
import { fetchJson } from "../shared/http";
import { RateLimiter } from "../shared/rateLimiter";
import { signAliExpressRequest } from "../shared/aliexpressSign";
import { cacheGet, cacheSet } from "../shared/cache";
import { CATEGORY_SEARCH_TERMS } from "../shared/categoryMap";
import { upsertProductFromGlobal } from "../shared/upsert";
import { withScraperLog } from "../shared/runLog";
import type { ParsedGlobalProduct, ScraperRunResult } from "../shared/types";

/**
 * O robots.txt do AliExpress bloqueia /wholesale*, /search/* e /api/* para
 * User-agent: * — os endpoints de busca pública sugeridos originalmente
 * violariam a política "respeitar robots.txt" combinada com você. Por isso
 * usamos a API oficial de afiliados (AliExpress Open Platform / TOP API),
 * que exige cadastro no portal de afiliados (ALIEXPRESS_APP_KEY/SECRET),
 * mas é o caminho documentado e sem scraping — igual ao Mercado Livre.
 */
const API_BASE = "https://api-sg.aliexpress.com/sync";
const METHOD = "aliexpress.affiliate.hotproduct.query";
const MIN_DELAY_MS = 2000;

interface AliExpressProduct {
  product_id: number;
  product_title: string;
  product_main_image_url?: string;
  target_sale_price?: string;
  lastest_volume?: number;
}

interface AliExpressHotProductResponse {
  aliexpress_affiliate_hotproduct_query_response?: {
    resp_result?: {
      result?: {
        products?: { product?: AliExpressProduct[] };
      };
    };
  };
}

/** Pura: extrai os produtos da resposta da API oficial de afiliados. */
export function parseAliExpressHotProducts(
  raw: AliExpressHotProductResponse,
  category: Category
): ParsedGlobalProduct[] {
  const products =
    raw.aliexpress_affiliate_hotproduct_query_response?.resp_result?.result?.products?.product ?? [];

  return products
    .filter((p) => p.product_title)
    .map((p) => ({
      name: p.product_title,
      category,
      imageUrl: p.product_main_image_url,
      platform: "aliexpress" as const,
      region: "US" as const,
      externalId: String(p.product_id),
      priceUS: p.target_sale_price ? Number(p.target_sale_price) : undefined,
      soldCountUS: p.lastest_volume,
    }));
}

function buildSignedParams(term: string, appKey: string, appSecret: string) {
  const baseParams: Record<string, string> = {
    app_key: appKey,
    method: METHOD,
    sign_method: "sha256",
    timestamp: String(Date.now()),
    v: "2.0",
    keywords: term,
    page_size: "50",
    target_currency: "USD",
    target_language: "EN",
  };
  const sign = signAliExpressRequest(baseParams, appSecret);
  return { ...baseParams, sign };
}

async function fetchCategory(
  category: Category,
  limiter: RateLimiter,
  appKey: string,
  appSecret: string
): Promise<ParsedGlobalProduct[]> {
  const items: ParsedGlobalProduct[] = [];

  for (const term of CATEGORY_SEARCH_TERMS[category].slice(0, 1)) {
    const cacheKey = `aliexpress:${term}`;
    let response = await cacheGet<AliExpressHotProductResponse>(cacheKey);

    if (!response) {
      await limiter.wait();
      const params = buildSignedParams(term, appKey, appSecret);
      response = await fetchJson<AliExpressHotProductResponse>(API_BASE, { params });
      await cacheSet(cacheKey, response, 6 * 60 * 60);
    }

    items.push(...parseAliExpressHotProducts(response, category));
  }

  return items;
}

export async function runAliExpressGlobalScraper(): Promise<ScraperRunResult> {
  return withScraperLog("ALIEXPRESS_GLOBAL", "GLOBAL", async () => {
    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;
    if (!appKey || !appSecret) {
      return {
        itemsFound: 0,
        itemsNew: 0,
        itemsUpdated: 0,
        errors: ["ALIEXPRESS_APP_KEY/ALIEXPRESS_APP_SECRET não configurados — pulei este scraper"],
      };
    }

    const limiter = new RateLimiter(MIN_DELAY_MS);
    const categories = Object.keys(CATEGORY_SEARCH_TERMS) as Category[];

    let itemsFound = 0;
    let itemsNew = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const category of categories) {
      try {
        const items = await fetchCategory(category, limiter, appKey, appSecret);
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
