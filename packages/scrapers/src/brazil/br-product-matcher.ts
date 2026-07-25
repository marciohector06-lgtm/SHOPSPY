import { prisma } from "@shopspy/database";
import { findSemanticMatch } from "@shopspy/ai";
import type { ExternalIds } from "@shopspy/shared";
import { fetchJson } from "../shared/http";
import { isPathAllowed } from "../shared/robots";
import { RateLimiter, SOURCE_MIN_DELAY_MS } from "../shared/rateLimiter";
import { withScraperLog } from "../shared/runLog";
import { parseShopeeResponse } from "./shopee-br";
import type { ParsedBRProduct, ScraperRunResult } from "../shared/types";

const SHOPEE_ORIGIN = "https://shopee.com.br";
const SHOPEE_SEARCH_PATH = "/api/v4/search/search_items";
// Limite por execução — cada produto gasta 1 busca Shopee + até 1 chamada
// Gemini (com cache 24h em callGeminiJson), então mantemos o lote pequeno
// pra caber num trigger manual/cron sem estourar o timeout de job (8min).
const BATCH_SIZE = 50;
const STOP_WORDS = new Set(["premium", "professional", "original", "new", "best", "top"]);

/** Pura: extrai o núcleo do nome (sem palavras genéricas) pra usar como busca na Shopee. */
export function extractMainKeyword(productName: string): string {
  const words = productName
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  return words.slice(0, 3).join(" ");
}

async function searchShopeeByKeyword(keyword: string, limiter: RateLimiter): Promise<ParsedBRProduct[]> {
  const allowed = await isPathAllowed(SHOPEE_ORIGIN, SHOPEE_SEARCH_PATH);
  if (!allowed) return [];

  await limiter.wait();
  const response = await fetchJson<Parameters<typeof parseShopeeResponse>[0]>(
    `${SHOPEE_ORIGIN}${SHOPEE_SEARCH_PATH}`,
    { params: { keyword, limit: 20, by: "sales", newest: 0 }, headers: { Referer: SHOPEE_ORIGIN } }
  );
  // Categoria real do produto já está salva no Product global — aqui só
  // usamos o nome dos candidatos pra matching semântico, não a categoria.
  return parseShopeeResponse(response, "OTHER");
}

/**
 * Tenta achar, pra cada produto global sem equivalente BR ainda
 * (firstSeenUS preenchido, firstSeenBR vazio — Product não tem campo
 * `platform` no schema real, por isso não usamos esse filtro), um produto
 * correspondente na Shopee: busca por palavra-chave extraída do nome, depois confirma com
 * `findSemanticMatch` (packages/ai/src/keyword-normalizer.ts, já usa Gemini
 * com cache e rate limit próprios) antes de gravar. Comissão de afiliado não
 * é preenchida — o endpoint público da Shopee não expõe isso (mesma
 * limitação documentada em shopee-br.ts).
 */
export async function matchProductsWithBR(): Promise<ScraperRunResult> {
  return withScraperLog("BR_MATCHER", "BR", async () => {
    const limiter = new RateLimiter(SOURCE_MIN_DELAY_MS.SHOPEE_BR);

    const globalProducts = await prisma.product.findMany({
      where: { firstSeenUS: { not: null }, firstSeenBR: null },
      take: BATCH_SIZE,
    });

    let itemsFound = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const product of globalProducts) {
      itemsFound++;
      try {
        const keyword = extractMainKeyword(product.name);
        const candidates = await searchShopeeByKeyword(keyword, limiter);
        if (candidates.length === 0) continue;

        const index = await findSemanticMatch(
          product.nameEn ?? product.name,
          candidates.map((c) => c.name)
        );
        if (index === -1) continue;

        const match = candidates[index]!;
        const externalIds = {
          ...((product.externalIds as ExternalIds | null) ?? {}),
          shopee: match.externalId,
        };

        await prisma.product.update({
          where: { id: product.id },
          data: {
            priceBR: match.priceBR,
            soldCountBR: match.soldCountBR,
            ratingBR: match.ratingBR,
            firstSeenBR: new Date(),
            externalIds,
          },
        });
        itemsUpdated++;
      } catch (error) {
        errors.push(`${product.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { itemsFound, itemsNew: 0, itemsUpdated, errors };
  });
}
