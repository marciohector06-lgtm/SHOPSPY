import {
  REGION_WEIGHTS,
  LATAM_REGION_WEIGHTS,
  ASIA_REGION_WEIGHTS,
  EUROPE_REGION_WEIGHTS,
  type InternationalRegion,
} from "@shopspy/shared";

type RegionScoreMap = Partial<Record<InternationalRegion, number>>;

function weightedAverage<K extends string>(scores: Partial<Record<K, number>>, weights: Record<K, number>): number {
  let total = 0;
  for (const region of Object.keys(weights) as K[]) {
    total += (scores[region] ?? 0) * weights[region];
  }
  return total;
}

/**
 * Pura: score internacional ponderado combinando as 11 regiões monitoradas
 * (REGION_WEIGHTS, packages/shared/src/constants.ts — soma 1.0, Europa com
 * peso 0 de propósito, é só monitoramento).
 */
export function calculateWeightedGlobalScore(regionalScores: RegionScoreMap): number {
  return weightedAverage(regionalScores, REGION_WEIGHTS);
}

/** Pura: score específico LATAM (MX/CO/AR/CL) — mais correlacionado com o BR. */
export function calculateLatamScore(regionalScores: RegionScoreMap): number {
  return weightedAverage(regionalScores, LATAM_REGION_WEIGHTS);
}

/** Pura: score específico Ásia (TH/ID/VN/JP). */
export function calculateAsiaScore(regionalScores: RegionScoreMap): number {
  return weightedAverage(regionalScores, ASIA_REGION_WEIGHTS);
}

/** Pura: score específico Europa (FR/DE/IT) — média simples, sem viés entre países. */
export function calculateEuropeScore(regionalScores: RegionScoreMap): number {
  return weightedAverage(regionalScores, EUROPE_REGION_WEIGHTS);
}
