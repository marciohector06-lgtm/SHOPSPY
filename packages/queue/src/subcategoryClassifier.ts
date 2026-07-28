import { prisma } from "@shopspy/database";
import { SUBCATEGORIES, type Category } from "@shopspy/shared";
import { classifySubcategory } from "@shopspy/ai";

export interface SubcategoryClassifierResult {
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
  errors: string[];
}

// Cada produto gasta 1 chamada Gemini (com cache 24h em callGeminiJson) —
// mesmo raciocínio de tamanho de lote do BR_MATCHER
// (packages/scrapers/src/brazil/br-product-matcher.ts): caber num trigger
// manual/cron sem estourar o timeout de job (8min).
const BATCH_SIZE = 100;

/**
 * Classifica Product.subcategory via IA (packages/ai classifySubcategory),
 * escolhendo entre as opções de SUBCATEGORIES[category]
 * (packages/shared/src/constants.ts) — nenhum scraper sabe esse nível de
 * detalhe hoje, só a categoria-mãe. Processa em lote os produtos ainda sem
 * subcategoria (subcategory: null); roda de novo a cada ciclo até zerar o
 * backlog, e continua pegando produto novo dali pra frente.
 */
export async function runSubcategoryClassifier(): Promise<SubcategoryClassifierResult> {
  const startedAt = Date.now();

  try {
    const result = await classifyBatch();
    await prisma.scraperLog.create({
      data: {
        source: "SUBCATEGORY_CLASSIFIER",
        region: "GLOBAL",
        status: result.errors.length > 0 ? "partial" : "success",
        itemsFound: result.itemsFound,
        itemsNew: result.itemsNew,
        itemsUpdated: result.itemsUpdated,
        duration: Date.now() - startedAt,
        error: result.errors.length > 0 ? result.errors.join("; ") : null,
      },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.scraperLog.create({
      data: {
        source: "SUBCATEGORY_CLASSIFIER",
        region: "GLOBAL",
        status: "error",
        itemsFound: 0,
        itemsNew: 0,
        itemsUpdated: 0,
        duration: Date.now() - startedAt,
        error: message,
      },
    });
    throw error;
  }
}

async function classifyBatch(): Promise<SubcategoryClassifierResult> {
  const products = await prisma.product.findMany({
    where: { subcategory: null },
    take: BATCH_SIZE,
  });

  let itemsUpdated = 0;
  const errors: string[] = [];

  for (const product of products) {
    try {
      const candidates = SUBCATEGORIES[product.category as Category] ?? [];
      const subcategory = await classifySubcategory(product.name, product.category, candidates);
      if (!subcategory) continue;

      await prisma.product.update({ where: { id: product.id }, data: { subcategory } });
      itemsUpdated++;
    } catch (error) {
      errors.push(`${product.id} (${product.name}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { itemsFound: products.length, itemsNew: 0, itemsUpdated, errors };
}
