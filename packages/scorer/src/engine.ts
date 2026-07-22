import { SCORE_WEIGHTS, type ScoreClass } from "@shopspy/shared";
import { classify, computeGap } from "./gap-analyzer";

export interface ScoreWeights {
  velocityUS: number;
  gapBRGlobal: number;
  commission: number;
  socialProof: number;
  ugcEase: number;
}

const ENV_KEYS: Record<keyof ScoreWeights, string> = {
  velocityUS: "SCORE_WEIGHT_VELOCITY_US",
  gapBRGlobal: "SCORE_WEIGHT_GAP_BR_GLOBAL",
  commission: "SCORE_WEIGHT_COMMISSION",
  socialProof: "SCORE_WEIGHT_SOCIAL_PROOF",
  ugcEase: "SCORE_WEIGHT_UGC_EASE",
};

/**
 * Lê os pesos do score a partir de variáveis de ambiente (ex.:
 * SCORE_WEIGHT_VELOCITY_US=0.30), caindo para SCORE_WEIGHTS de
 * @shopspy/shared quando a variável não existe ou não é um número válido.
 * Recebe `env` por parâmetro (default process.env) só para poder testar
 * sem sujar o ambiente global.
 */
export function getScoreWeights(env: NodeJS.ProcessEnv = process.env): ScoreWeights {
  const weights = {} as ScoreWeights;
  for (const key of Object.keys(ENV_KEYS) as Array<keyof ScoreWeights>) {
    const raw = env[ENV_KEYS[key]];
    const parsed = raw === undefined ? NaN : Number(raw);
    weights[key] = Number.isFinite(parsed) ? parsed : SCORE_WEIGHTS[key];
  }
  return weights;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Pura: +200% de crescimento semanal => 100, 0% => 50 (neutro), -200% => 0. */
export function scoreVelocity(weeklyChangeUS: number): number {
  return clamp(50 + weeklyChangeUS / 4, 0, 100);
}

/** Pura: normaliza o gap bruto (-100..100) para uma escala de score 0-100. */
export function scoreGap(gap: number): number {
  return clamp(50 + gap / 2, 0, 100);
}

/** Pura: comissão 0% => 0 (penaliza todo o peso do componente), 30%+ => 100. */
export function scoreCommission(commissionPctBR: number | null): number {
  if (commissionPctBR === null) return 0;
  return clamp((commissionPctBR / 30) * 100, 0, 100);
}

/** Pura: combina avaliação, vendidos (escala log) e nº de criadores promovendo. */
export function scoreSocialProof(
  ratingBR: number | null,
  soldCountBR: number | null,
  creatorVideosBR: number | null
): number {
  const ratingComponent = ratingBR !== null ? (ratingBR / 5) * 100 : 50;
  const soldComponent =
    soldCountBR && soldCountBR > 0 ? clamp((Math.log10(soldCountBR + 1) / Math.log10(50_000)) * 100, 0, 100) : 0;
  const videosComponent = creatorVideosBR ? clamp((creatorVideosBR / 50) * 100, 0, 100) : 0;

  return (ratingComponent + soldComponent + videosComponent) / 3;
}

export interface ScoreEngineInput {
  weeklyChangeUS: number;
  weeklyChangeBR: number;
  globalTrendsIndex: number; // 0-100
  trendsBR: number; // 0-100
  commissionPctBR: number | null;
  ratingBR: number | null;
  soldCountBR: number | null;
  creatorVideosBR: number | null;
  ugcScore: number; // 0-100, vem do ugc-classifier
}

export interface ScoreComponents {
  scoreVelocityUS: number;
  scoreGapBRUS: number;
  scoreCommission: number;
  scoreSocialProof: number;
  scoreUGC: number;
}

export interface ScoreResult {
  scoreTotal: number;
  classification: ScoreClass;
  gap: number;
  components: ScoreComponents;
}

/** Combina os 5 componentes ponderados (pesos configuráveis) e classifica o resultado. */
export function calculateScore(
  input: ScoreEngineInput,
  weights: ScoreWeights = getScoreWeights()
): ScoreResult {
  const gap = computeGap(input.globalTrendsIndex, input.trendsBR);

  const components: ScoreComponents = {
    scoreVelocityUS: scoreVelocity(input.weeklyChangeUS),
    scoreGapBRUS: scoreGap(gap),
    scoreCommission: scoreCommission(input.commissionPctBR),
    scoreSocialProof: scoreSocialProof(input.ratingBR, input.soldCountBR, input.creatorVideosBR),
    scoreUGC: input.ugcScore,
  };

  const scoreTotal = clamp(
    components.scoreVelocityUS * weights.velocityUS +
      components.scoreGapBRUS * weights.gapBRGlobal +
      components.scoreCommission * weights.commission +
      components.scoreSocialProof * weights.socialProof +
      components.scoreUGC * weights.ugcEase,
    0,
    100
  );

  const classification = classify({
    scoreTotal,
    globalScore: input.globalTrendsIndex,
    brScore: input.trendsBR,
    weeklyChangeUS: input.weeklyChangeUS,
    weeklyChangeBR: input.weeklyChangeBR,
  });

  return { scoreTotal, classification, gap, components };
}
