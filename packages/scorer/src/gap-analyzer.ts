import type { ScoreClass } from "@shopspy/shared";

export interface GapClassificationInput {
  scoreTotal: number; // score ponderado final (0-100)
  globalScore: number; // índice global de tendência (0-100)
  brScore: number; // trendsBR / searchesBR normalizado (0-100)
  weeklyChangeUS: number; // % de crescimento semanal nos EUA/global
  weeklyChangeBR: number; // % de crescimento semanal no BR
}

/** Pura: gap bruto entre o índice global e o score BR (usado no classify e no window estimator). */
export function computeGap(globalScore: number, brScore: number): number {
  return globalScore - brScore;
}

/**
 * Implementa a lógica de cruzamento global → Brasil do produto:
 *   MAXIMUM    → score US alto (>75) + quase zero equivalente no BR
 *   HIGH       → score US alto (>75) + BR ainda fraco (<40)
 *   SATURATING → BR já alto (>=70) — chegou tarde, tem prioridade sobre MEDIUM
 *   MEDIUM     → score US médio (50-75) + BR crescendo
 *   AVOID      → score US caindo + BR saturado, ou nenhum critério acima bate
 * scoreTotal (ponderado) desempata os casos que não se encaixam claramente
 * em nenhuma regra categórica acima.
 */
export function classify(input: GapClassificationInput): ScoreClass {
  const { scoreTotal, globalScore, brScore, weeklyChangeUS, weeklyChangeBR } = input;
  const gap = computeGap(globalScore, brScore);

  if (globalScore > 75 && brScore < 10) return "MAXIMUM";
  if (globalScore > 75 && brScore < 40) return "HIGH";
  // AVOID (caindo + saturado) é mais específico que SATURATING (só saturado)
  // e por isso é checado antes, senão nunca seria alcançado.
  if (weeklyChangeUS < 0 && brScore >= 70) return "AVOID";
  if (brScore >= 70) return "SATURATING";
  if (globalScore >= 50 && globalScore <= 75 && weeklyChangeBR > 0) return "MEDIUM";

  // Nenhuma regra categórica bateu: usa o score ponderado como desempate.
  // MAXIMUM aqui também exige gap alto — score sozinho não basta.
  if (scoreTotal >= 80 && gap >= 40) return "MAXIMUM";
  if (scoreTotal >= 65) return "HIGH";
  if (scoreTotal >= 50) return "MEDIUM";
  return "AVOID";
}
