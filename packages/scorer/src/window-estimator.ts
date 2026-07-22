export type WindowConfidence = "low" | "medium" | "high";

export interface WindowEstimate {
  windowWeeks: number | null;
  windowLabel: string;
  confidence: WindowConfidence;
}

export interface WindowEstimateInput {
  gap: number;
  brScore: number;
  /** Quantos produtos da mesma categoria já têm histórico de score suficiente para calibrar a estimativa. */
  similarProductsHistoryCount: number;
}

/**
 * Estima quantas semanas até o produto saturar no BR, calibrado por
 * histórico de produtos similares. Sem histórico (produto novo/categoria
 * pouco vista), a confiança cai — o número de semanas continua sendo uma
 * estimativa, só que menos confiável.
 */
export function estimateWindow(input: WindowEstimateInput): WindowEstimate {
  const { gap, brScore, similarProductsHistoryCount } = input;

  let windowWeeks: number | null;
  let windowLabel: string;

  if (gap > 60 && brScore < 20) {
    windowWeeks = 2;
    windowLabel = "2-3 semanas";
  } else if (gap > 40 && brScore < 40) {
    windowWeeks = 3;
    windowLabel = "3-5 semanas";
  } else if (gap > 20 && brScore < 60) {
    windowWeeks = 4;
    windowLabel = "1-2 meses";
  } else {
    windowWeeks = null;
    windowLabel = "Chegou tarde";
  }

  const confidence: WindowConfidence =
    similarProductsHistoryCount >= 10 ? "high" : similarProductsHistoryCount >= 3 ? "medium" : "low";

  return { windowWeeks, windowLabel, confidence };
}
