import { prisma, type Product, type TrendScore } from "@shopspy/database";
import { isoWeek } from "@shopspy/shared";
import { scoreProduct } from "@shopspy/scorer";

export interface ScoreCalculatorResult {
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
  errors: string[];
}

const MAX_TYPICAL_BESTSELLERS_RANK = 60; // tamanho comum de uma página de bestsellers da Amazon

/**
 * Proxy de índice de tendência global (0-100) a partir do rank real da
 * Amazon — não é Google Trends de verdade, mas é o sinal real mais forte
 * que temos hoje sem a Fase de Google Trends Global totalmente povoada
 * (rate-limitada pela API não-oficial). Rank 1 => 100, rank 60+ => próximo
 * de 0. Documentado aqui de propósito pra não confundir com trends real
 * no futuro.
 */
function globalIndexFromRank(rank: number | null): number | null {
  if (rank === null) return null;
  const clamped = Math.min(Math.max(rank, 1), MAX_TYPICAL_BESTSELLERS_RANK);
  return Math.round(100 - ((clamped - 1) / (MAX_TYPICAL_BESTSELLERS_RANK - 1)) * 100);
}

/** US pesa mais que UK como índice "global" — mesma lógica de GLOBAL_TRENDS_WEIGHTS (US > UK). */
function blendGlobalIndex(usIndex: number | null, ukIndex: number | null): number {
  if (usIndex !== null && ukIndex !== null) return Math.round(usIndex * 0.6 + ukIndex * 0.4);
  return usIndex ?? ukIndex ?? 0;
}

/**
 * SCORE_CALCULATOR de verdade: pontua todo produto com sinal de rank da
 * Amazon (US ou UK), usando o Score Engine real (@shopspy/scorer), e
 * grava em TrendScore pra semana ISO atual (upsert — reprocessar a mesma
 * semana atualiza em vez de duplicar, por causa do @@unique).
 *
 * Sem Google Trends BR/Global totalmente povoados ainda, trendsBR e as
 * variações semana-a-semana caem em 0 (neutro) quando não há dado real —
 * nunca inventamos um número pra preencher a lacuna.
 */
export async function runScoreCalculator(): Promise<ScoreCalculatorResult> {
  const { weekNumber, year } = isoWeek(new Date());

  const products = await prisma.product.findMany({
    where: { OR: [{ amazonRankUS: { not: null } }, { amazonRankUK: { not: null } }] },
  });

  // Histórico por categoria (calibra windowConfidence) e último score anterior
  // por produto (calibra weeklyChange real) — os dois em uma única leitura
  // de TrendScore em vez de uma query por produto.
  const allScores = await prisma.trendScore.findMany({
    orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
    include: { product: { select: { category: true } } },
  });

  const categoryHistoryCount = new Map<string, number>();
  const previousByProduct = new Map<string, TrendScore>();
  for (const score of allScores) {
    categoryHistoryCount.set(score.product.category, (categoryHistoryCount.get(score.product.category) ?? 0) + 1);
    if (!previousByProduct.has(score.productId)) previousByProduct.set(score.productId, score);
  }

  const errors: string[] = [];
  let scored = 0;

  for (const product of products) {
    try {
      scored += await scoreOneProduct(product, { weekNumber, year, categoryHistoryCount, previousByProduct });
    } catch (error) {
      errors.push(`${product.id} (${product.name}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { itemsFound: products.length, itemsNew: scored, itemsUpdated: 0, errors };
}

interface ScoreContext {
  weekNumber: number;
  year: number;
  categoryHistoryCount: Map<string, number>;
  previousByProduct: Map<string, TrendScore>;
}

async function scoreOneProduct(product: Product, ctx: ScoreContext): Promise<1 | 0> {
  const globalTrendsIndex = blendGlobalIndex(
    globalIndexFromRank(product.amazonRankUS),
    globalIndexFromRank(product.amazonRankUK)
  );
  const trendsBR = 0; // sem Google Trends BR povoado ainda

  const previous = ctx.previousByProduct.get(product.id);
  const weeklyChangeUS =
    previous && previous.trendsUS > 0 ? ((globalTrendsIndex - previous.trendsUS) / previous.trendsUS) * 100 : 0;
  const weeklyChangeBR =
    previous && previous.trendsBR > 0 ? ((trendsBR - previous.trendsBR) / previous.trendsBR) * 100 : 0;

  const result = await scoreProduct({
    name: product.name,
    category: product.category,
    weeklyChangeUS,
    weeklyChangeBR,
    globalTrendsIndex,
    trendsBR,
    commissionPctBR: product.commissionPctBR,
    ratingBR: product.ratingBR,
    soldCountBR: product.soldCountBR,
    creatorVideosBR: product.creatorVideosBR,
    similarProductsHistoryCount: ctx.categoryHistoryCount.get(product.category) ?? 0,
  });

  const data = {
    productId: product.id,
    scoreTotal: result.scoreTotal,
    classification: result.classification,
    scoreVelocityUS: result.components.scoreVelocityUS,
    scoreGapBRUS: result.components.scoreGapBRUS,
    scoreCommission: result.components.scoreCommission,
    scoreSocialProof: result.components.scoreSocialProof,
    scoreUGC: result.components.scoreUGC,
    trendsUS: globalTrendsIndex,
    trendsBR,
    trendsUK: globalIndexFromRank(product.amazonRankUK),
    gap: result.gap,
    weeklyChangeUS,
    weeklyChangeBR,
    windowWeeks: result.windowWeeks,
    windowLabel: result.windowLabel,
    weekNumber: ctx.weekNumber,
    year: ctx.year,
  };

  await prisma.trendScore.upsert({
    where: { productId_weekNumber_year: { productId: product.id, weekNumber: ctx.weekNumber, year: ctx.year } },
    create: data,
    update: data,
  });

  return 1;
}
