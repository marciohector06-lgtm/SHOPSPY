import type { Category } from "@shopspy/shared";
import { fetchJson } from "../shared/http";
import { RateLimiter, SOURCE_MIN_DELAY_MS } from "../shared/rateLimiter";
import { CATEGORY_SEARCH_TERMS } from "../shared/categoryMap";
import { isPathAllowed } from "../shared/robots";
import { cacheGet, cacheSet } from "../shared/cache";
import { upsertProductFromBR } from "../shared/upsert";
import { withScraperLog } from "../shared/runLog";
import type { ParsedBRProduct, ScraperRunResult } from "../shared/types";

const ORIGIN = "https://shopee.com.br";
const SEARCH_PATH = "/api/v4/search/search_items";

interface ShopeeItemBasic {
  itemid: number;
  shopid: number;
  name: string;
  price: number; // valor real * 100000 (unidade usada pela API da Shopee)
  historical_sold?: number;
  item_rating?: { rating_star?: number };
  images?: string[];
}

interface ShopeeSearchResponse {
  items?: Array<{ item_basic: ShopeeItemBasic }>;
}

/**
 * Endpoint público de busca da Shopee — liberado pelo robots.txt (grupo
 * User-agent: *, Crawl-delay: 1). Não requer login. Comissão de afiliado
 * não é exposta nesse endpoint (só no painel do afiliado, que exigiria
 * login — fora de escopo por decisão do produto), então fica undefined
 * aqui e é preenchida depois se houver outra fonte.
 * Pura: recebe o JSON já buscado, sem I/O, para facilitar testes.
 */
export function parseShopeeResponse(
  raw: ShopeeSearchResponse,
  category: Category
): ParsedBRProduct[] {
  if (!raw.items) return [];

  return raw.items.map(({ item_basic }) => ({
    name: item_basic.name,
    category,
    imageUrl: item_basic.images?.[0]
      ? `https://cf.shopee.com.br/file/${item_basic.images[0]}`
      : undefined,
    platform: "shopee" as const,
    externalId: `${item_basic.shopid}_${item_basic.itemid}`,
    priceBR: item_basic.price / 100_000,
    soldCountBR: item_basic.historical_sold,
    ratingBR: item_basic.item_rating?.rating_star,
  }));
}

async function searchCategory(
  category: Category,
  limiter: RateLimiter
): Promise<ParsedBRProduct[]> {
  const terms = CATEGORY_SEARCH_TERMS[category];
  const items: ParsedBRProduct[] = [];

  const allowed = await isPathAllowed(ORIGIN, SEARCH_PATH);
  if (!allowed) {
    throw new Error(`robots.txt bloqueia ${SEARCH_PATH} — scraper abortado por segurança`);
  }

  for (const term of terms) {
    const cacheKey = `shopee-br:${term}`;
    const cached = await cacheGet<ShopeeSearchResponse>(cacheKey);

    let response = cached;
    if (!response) {
      await limiter.wait();
      response = await fetchJson<ShopeeSearchResponse>(`${ORIGIN}${SEARCH_PATH}`, {
        params: { keyword: term, limit: 50, by: "sales", newest: 0 },
        headers: { Referer: ORIGIN },
      });
      await cacheSet(cacheKey, response, 4 * 60 * 60);
    }

    items.push(...parseShopeeResponse(response, category));
  }

  return items;
}

export async function runShopeeBRScraper(): Promise<ScraperRunResult> {
  return withScraperLog("SHOPEE_BR", "BR", async () => {
    const limiter = new RateLimiter(SOURCE_MIN_DELAY_MS.SHOPEE_BR);
    const categories = Object.keys(CATEGORY_SEARCH_TERMS) as Category[];

    let itemsFound = 0;
    let itemsNew = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const category of categories) {
      try {
        const items = await searchCategory(category, limiter);
        itemsFound += items.length;
        for (const item of items) {
          const { created } = await upsertProductFromBR(item);
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
