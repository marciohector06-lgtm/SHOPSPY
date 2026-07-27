import { isAxiosError } from "axios";
import { prisma } from "@shopspy/database";
import { findSemanticMatch, findSemanticMatchWithScore } from "@shopspy/ai";
import type { ExternalIds } from "@shopspy/shared";
import { fetchJson } from "../shared/http";
import { isPathAllowed } from "../shared/robots";
import { RateLimiter, SOURCE_MIN_DELAY_MS } from "../shared/rateLimiter";
import { withScraperLog } from "../shared/runLog";
import { parseShopeeResponse } from "./shopee-br";
import type { ParsedBRProduct, ScraperRunResult } from "../shared/types";

const SHOPEE_ORIGIN = "https://shopee.com.br";
const SHOPEE_SEARCH_PATH = "/api/v4/search/search_items";
const ML_ORIGIN = "https://api.mercadolibre.com";
const ML_SEARCH_PATH = "/sites/MLB/search";
// Threshold explícito só pro fallback ML — a Shopee usa o julgamento
// interno do prompt de findSemanticMatch ("-1 se nenhum for parecido"),
// mas o ML tende a trazer resultados mais genéricos/dispersos por busca
// textual simples, então exigimos um score mínimo pra não gravar lixo.
const ML_MIN_SIMILARITY = 0.7;
// Limite por execução — cada produto gasta 1 busca Shopee (+ 1 busca ML se
// a Shopee bloquear) + até 1 chamada Gemini (com cache 24h em
// callGeminiJson), então mantemos o lote pequeno pra caber num trigger
// manual/cron sem estourar o timeout de job (8min).
const BATCH_SIZE = 50;
const STOP_WORDS = new Set(["premium", "professional", "original", "new", "best", "top"]);

/** Pura: extrai o núcleo do nome (sem palavras genéricas) pra usar como busca na Shopee/ML. */
export function extractMainKeyword(productName: string): string {
  const words = productName
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  return words.slice(0, 3).join(" ");
}

/** 403 é o sinal de bloqueio de IP de datacenter já documentado pro endpoint público da Shopee — outros erros (timeout, 5xx) não acionam o fallback ML, só falham esse produto como antes. */
function isForbidden(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403;
}

async function searchShopeeByKeyword(keyword: string, limiter: RateLimiter): Promise<ParsedBRProduct[]> {
  const allowed = await isPathAllowed(SHOPEE_ORIGIN, SHOPEE_SEARCH_PATH);
  if (!allowed) return [];

  await limiter.wait();
  // retries: 0 — um 403 aqui é bloqueio de IP de datacenter (permanente
  // pra essa execução, não resolve esperando e tentando de novo do mesmo
  // IP). Sem isso, os 3 retries com backoff padrão do fetchJson (~35s por
  // produto) somavam mais que o timeout de job de 8min pro BATCH_SIZE=50
  // inteiro — o fallback ML já existe justamente pra esse caso, retry
  // aqui só atrasava chegar nele.
  const response = await fetchJson<Parameters<typeof parseShopeeResponse>[0]>(
    `${SHOPEE_ORIGIN}${SHOPEE_SEARCH_PATH}`,
    { params: { keyword, limit: 20, by: "sales", newest: 0 }, headers: { Referer: SHOPEE_ORIGIN }, retries: 0 }
  );
  // Categoria real do produto já está salva no Product global — aqui só
  // usamos o nome dos candidatos pra matching semântico, não a categoria.
  return parseShopeeResponse(response, "OTHER");
}

interface MLSearchItem {
  id: string;
  title: string;
  price: number;
  sold_quantity?: number;
  thumbnail?: string;
}

interface MLSearchResponse {
  results?: MLSearchItem[];
}

/**
 * Pura: a API pública de busca do Mercado Livre (sites/MLB/search) não
 * expõe rating no payload de busca (só no endpoint de detalhe do item,
 * que exigiria 1 request extra por candidato) — ratingBR fica undefined
 * aqui, igual já acontece com outros campos opcionais de ParsedBRProduct.
 */
export function parseMercadoLivreResponse(raw: MLSearchResponse): ParsedBRProduct[] {
  if (!raw.results) return [];

  return raw.results.map((item) => ({
    name: item.title,
    category: "OTHER" as const,
    imageUrl: item.thumbnail,
    platform: "mercadoLivre" as const,
    externalId: item.id,
    priceBR: item.price,
    soldCountBR: item.sold_quantity,
  }));
}

/**
 * Fallback quando a Shopee bloqueia por IP de datacenter (403) — a API
 * pública do ML não tem essa restrição. Mesmo endpoint testável descrito
 * pelo usuário: GET /sites/MLB/search?q={keyword}&limit=5.
 */
async function searchMercadoLivreByKeyword(keyword: string, limiter: RateLimiter): Promise<ParsedBRProduct[]> {
  const allowed = await isPathAllowed(ML_ORIGIN, ML_SEARCH_PATH);
  if (!allowed) return [];

  await limiter.wait();
  const response = await fetchJson<MLSearchResponse>(`${ML_ORIGIN}${ML_SEARCH_PATH}`, {
    params: { q: keyword, limit: 5 },
  });
  return parseMercadoLivreResponse(response);
}

/**
 * Busca candidatos na Shopee; se a Shopee bloquear por IP de datacenter
 * (403), cai pro Mercado Livre (API pública, sem esse bloqueio) — nesse
 * caso o match exige similarity > ML_MIN_SIMILARITY (findSemanticMatchWithScore),
 * mais estrito que o julgamento livre do prompt usado na Shopee, porque
 * busca textual simples do ML tende a trazer resultado mais disperso.
 */
async function findBRMatch(
  product: { name: string; nameEn: string | null },
  shopeeLimiter: RateLimiter,
  mlLimiter: RateLimiter
): Promise<ParsedBRProduct | null> {
  const keyword = extractMainKeyword(product.name);

  let candidates: ParsedBRProduct[];
  try {
    candidates = await searchShopeeByKeyword(keyword, shopeeLimiter);
  } catch (error) {
    if (!isForbidden(error)) throw error;
    candidates = await searchMercadoLivreByKeyword(keyword, mlLimiter);
    if (candidates.length === 0) return null;

    const { index, similarity } = await findSemanticMatchWithScore(
      product.nameEn ?? product.name,
      candidates.map((c) => c.name)
    );
    return index === -1 || similarity <= ML_MIN_SIMILARITY ? null : candidates[index]!;
  }

  if (candidates.length === 0) return null;

  const index = await findSemanticMatch(product.nameEn ?? product.name, candidates.map((c) => c.name));
  return index === -1 ? null : candidates[index]!;
}

/**
 * Tenta achar, pra cada produto global sem equivalente BR ainda
 * (firstSeenUS preenchido, firstSeenBR vazio — Product não tem campo
 * `platform` no schema real, por isso não usamos esse filtro), um produto
 * correspondente na Shopee (ou no Mercado Livre, se a Shopee bloquear o IP)
 * antes de gravar. Comissão de afiliado não é preenchida — nenhum dos dois
 * endpoints públicos expõe isso (mesma limitação documentada em shopee-br.ts).
 */
export async function matchProductsWithBR(): Promise<ScraperRunResult> {
  return withScraperLog("BR_MATCHER", "BR", async () => {
    const shopeeLimiter = new RateLimiter(SOURCE_MIN_DELAY_MS.SHOPEE_BR);
    const mlLimiter = new RateLimiter(SOURCE_MIN_DELAY_MS.MERCADOLIVRE_BR);

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
        const match = await findBRMatch(product, shopeeLimiter, mlLimiter);
        if (!match) continue;

        const externalIds = {
          ...((product.externalIds as ExternalIds | null) ?? {}),
          [match.platform]: match.externalId,
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
