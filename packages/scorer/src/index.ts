import type { Category } from "@shopspy/shared";
import { analyzeOpportunity } from "@shopspy/ai";
import { calculateScore, getScoreWeights, type ScoreEngineInput, type ScoreResult, type ScoreWeights } from "./engine";
import { estimateWindow, type WindowEstimate } from "./window-estimator";
import { classifyUGCDifficulty, type UGCDifficulty } from "./ugc-classifier";

export * from "./engine";
export * from "./gap-analyzer";
export * from "./window-estimator";
export * from "./ugc-classifier";

export interface ScoreProductInput {
  name: string;
  category: Category;
  weeklyChangeUS: number;
  weeklyChangeBR: number;
  globalTrendsIndex: number;
  trendsBR: number;
  commissionPctBR: number | null;
  ratingBR: number | null;
  soldCountBR: number | null;
  creatorVideosBR: number | null;
  /** Quantos produtos da mesma categoria já têm histórico de score (calibra a confiança da janela). */
  similarProductsHistoryCount: number;
}

export interface CompleteScoreResult extends ScoreResult {
  windowWeeks: number | null;
  windowLabel: string;
  windowConfidence: WindowEstimate["confidence"];
  ugcDifficulty: UGCDifficulty;
  opportunityText: string;
}

/**
 * Orquestra o Score Engine completo para um produto: componentes + score
 * total + classificação (engine.ts/gap-analyzer.ts), janela de
 * oportunidade (window-estimator.ts), facilidade de UGC (ugc-classifier.ts)
 * e o resumo em texto gerado pela IA (opportunity-analyst, já com fallback
 * próprio — se o Gemini falhar, opportunityText vem "").
 */
export async function scoreProduct(
  input: ScoreProductInput,
  weights: ScoreWeights = getScoreWeights()
): Promise<CompleteScoreResult> {
  const ugc = classifyUGCDifficulty(input.name, input.category);

  const engineInput: ScoreEngineInput = {
    weeklyChangeUS: input.weeklyChangeUS,
    weeklyChangeBR: input.weeklyChangeBR,
    globalTrendsIndex: input.globalTrendsIndex,
    trendsBR: input.trendsBR,
    commissionPctBR: input.commissionPctBR,
    ratingBR: input.ratingBR,
    soldCountBR: input.soldCountBR,
    creatorVideosBR: input.creatorVideosBR,
    ugcScore: ugc.score,
  };

  const score = calculateScore(engineInput, weights);

  const window = estimateWindow({
    gap: score.gap,
    brScore: input.trendsBR,
    similarProductsHistoryCount: input.similarProductsHistoryCount,
  });

  const opportunityText = await analyzeOpportunity({
    name: input.name,
    weeklyChangeUS: input.weeklyChangeUS,
    searchesBR: input.trendsBR,
    gap: score.gap,
    commissionValueBR: null,
    soldCountBR: input.soldCountBR,
    windowLabel: window.windowLabel,
  });

  return {
    ...score,
    windowWeeks: window.windowWeeks,
    windowLabel: window.windowLabel,
    windowConfidence: window.confidence,
    ugcDifficulty: ugc.difficulty,
    opportunityText,
  };
}
