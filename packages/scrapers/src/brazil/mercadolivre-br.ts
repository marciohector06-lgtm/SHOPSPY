import type { Category } from "@shopspy/shared";
import { fetchJson } from "../shared/http";
import { RateLimiter, SOURCE_MIN_DELAY_MS } from "../shared/rateLimiter";
import { CATEGORY_SEARCH_TERMS } from "../shared/categoryMap";
import { cacheGet, cacheSet } from "../shared/cache";
import { upsertProductFromBR } from "../shared/upsert";
import { withScraperLog } from "../shared/runLog";
import type { ParsedBRProduct, ScraperRunResult } from "../shared/types";

const API_BASE = "https://api.mercadolibre.com";

interface MLSearchResult {
  id: string;
  title: string;
  thumbnail?: string;
  price?: number;
  sold_quantity?: number;
}

interface MLSearchResponse {
  results: MLSearchResult[];
}

/**
 * Endpoint oficial e público do Developer Program do Mercado Livre
 * (developers.mercadolibre.com.br) — não requer autenticação para busca.
 * Pura: recebe o JSON já buscado, sem I/O, para facilitar testes.
 */
export function parseMercadoLivreResponse(
  raw: MLSearchResponse,
  category: Category
): ParsedBRProduct[] {
  return raw.results
    .filter((item) => typeof item.price === "number")
    .map((item) => ({
      name: item.title,
      category,
      imageUrl: item.thumbnail,
      platform: "mercadoLivre" as const,
      externalId: item.id,
      priceBR: item.price,
      soldCountBR: item.sold_quantity,
    }));
}

async function searchCategory(
  category: Category,
  limiter: RateLimiter
): Promise<ParsedBRProduct[]> {
  const terms = CATEGORY_SEARCH_TERMS[category];
  const items: ParsedBRProduct[] = [];

  for (const term of terms) {
    const cacheKey = `ml-br:${term}`;
    const cached = await cacheGet<MLSearchResponse>(cacheKey);

    let response = cached;
    if (!response) {
      await limiter.wait();
      response = await fetchJson<MLSearchResponse>(`${API_BASE}/sites/MLB/search`, {
        params: { q: term, sort: "sold_quantity_desc", limit: 50 },
      });
      await cacheSet(cacheKey, response, 4 * 60 * 60);
    }

    items.push(...parseMercadoLivreResponse(response, category));
  }

  return items;
}

export async function runMercadoLivreBRScraper(): Promise<ScraperRunResult> {
  return withScraperLog("MERCADOLIVRE_BR", "BR", async () => {
    const limiter = new RateLimiter(SOURCE_MIN_DELAY_MS.MERCADOLIVRE_BR);
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
