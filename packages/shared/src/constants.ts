import type { ScoreClass } from "./types";

// Pesos do score principal (packages/scorer/src/engine.ts, Fase 5).
// Devem somar 1.0 — coberto por teste em tests/unit/constants.test.ts.
export const SCORE_WEIGHTS = {
  velocityUS: 0.3,
  gapBRGlobal: 0.25,
  commission: 0.2,
  socialProof: 0.15,
  ugcEase: 0.1,
} as const;

export const CLASSIFICATION_EMOJI: Record<ScoreClass, string> = {
  MAXIMUM: "🔥",
  HIGH: "✅",
  MEDIUM: "📈",
  SATURATING: "⚠️",
  AVOID: "🚫",
};

export const GLOBAL_TRENDS_WEIGHTS = {
  US: 0.4,
  UK: 0.25,
  AU: 0.2,
  CA: 0.15,
} as const;
