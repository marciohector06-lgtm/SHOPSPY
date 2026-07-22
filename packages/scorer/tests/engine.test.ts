import { describe, expect, it } from "vitest";
import { calculateScore, getScoreWeights, type ScoreEngineInput } from "../src/engine";

const PERFECT: ScoreEngineInput = {
  weeklyChangeUS: 200,
  weeklyChangeBR: 0,
  globalTrendsIndex: 100,
  trendsBR: 0,
  commissionPctBR: 30,
  ratingBR: 5,
  soldCountBR: 50_000,
  creatorVideosBR: 50,
  ugcScore: 100,
};

const SATURATED: ScoreEngineInput = {
  weeklyChangeUS: 5,
  weeklyChangeBR: -10,
  globalTrendsIndex: 20,
  trendsBR: 90,
  commissionPctBR: 0,
  ratingBR: null,
  soldCountBR: 0,
  creatorVideosBR: 0,
  ugcScore: 20,
};

describe("calculateScore", () => {
  it("produto perfeito retorna score 100", () => {
    const result = calculateScore(PERFECT);
    expect(result.scoreTotal).toBe(100);
    expect(result.classification).toBe("MAXIMUM");
  });

  it("produto saturado retorna score < 30", () => {
    const result = calculateScore(SATURATED);
    expect(result.scoreTotal).toBeLessThan(30);
    expect(result.classification).toBe("SATURATING");
  });

  it("gap alto aumenta score significativamente", () => {
    const lowGap = calculateScore({ ...PERFECT, globalTrendsIndex: 50, trendsBR: 50 });
    const highGap = calculateScore({ ...PERFECT, globalTrendsIndex: 90, trendsBR: 10 });
    expect(highGap.scoreTotal - lowGap.scoreTotal).toBeGreaterThanOrEqual(10);
  });

  it("comissão zero penaliza o score exatamente no peso do componente (20% por padrão)", () => {
    const withCommission = calculateScore({ ...PERFECT, commissionPctBR: 30 });
    const withoutCommission = calculateScore({ ...PERFECT, commissionPctBR: 0 });
    const weights = getScoreWeights();
    expect(withCommission.scoreTotal - withoutCommission.scoreTotal).toBeCloseTo(
      weights.commission * 100,
      5
    );
  });

  it("classificação MAXIMUM requer score >= 80 E gap >= 40 (não só o score)", () => {
    // score alto mas gap baixo (BR já forte também) não deve virar MAXIMUM
    const highScoreLowGap = calculateScore({
      ...PERFECT,
      globalTrendsIndex: 60,
      trendsBR: 55, // gap = 5, mas mantém tudo mais alto pra forçar scoreTotal >= 80
      weeklyChangeBR: -5, // evita cair na regra categórica MEDIUM (BR crescendo)
    });
    expect(highScoreLowGap.gap).toBeLessThan(40);
    expect(highScoreLowGap.classification).not.toBe("MAXIMUM");
  });

  it("valores null não quebram o cálculo", () => {
    const result = calculateScore({
      weeklyChangeUS: 0,
      weeklyChangeBR: 0,
      globalTrendsIndex: 50,
      trendsBR: 50,
      commissionPctBR: null,
      ratingBR: null,
      soldCountBR: null,
      creatorVideosBR: null,
      ugcScore: 60,
    });
    expect(Number.isFinite(result.scoreTotal)).toBe(true);
  });

  it("score nunca ultrapassa 100 ou fica abaixo de 0", () => {
    const aboveMax = calculateScore({ ...PERFECT, weeklyChangeUS: 10_000, commissionPctBR: 1000 });
    const belowMin = calculateScore({ ...SATURATED, weeklyChangeUS: -10_000 });
    expect(aboveMax.scoreTotal).toBeLessThanOrEqual(100);
    expect(belowMin.scoreTotal).toBeGreaterThanOrEqual(0);
  });
});

describe("getScoreWeights", () => {
  it("usa os valores padrão quando nenhuma env var está definida", () => {
    const weights = getScoreWeights({});
    expect(weights).toEqual({
      velocityUS: 0.3,
      gapBRGlobal: 0.25,
      commission: 0.2,
      socialProof: 0.15,
      ugcEase: 0.1,
    });
  });

  it("sobrescreve um peso individual via env var", () => {
    const weights = getScoreWeights({ SCORE_WEIGHT_VELOCITY_US: "0.5" } as NodeJS.ProcessEnv);
    expect(weights.velocityUS).toBe(0.5);
    expect(weights.gapBRGlobal).toBe(0.25); // resto continua no padrão
  });

  it("ignora valores inválidos e cai para o padrão", () => {
    const weights = getScoreWeights({ SCORE_WEIGHT_COMMISSION: "not-a-number" } as NodeJS.ProcessEnv);
    expect(weights.commission).toBe(0.2);
  });
});
