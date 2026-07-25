import { describe, expect, it } from "vitest";
import { REGION_WEIGHTS, LATAM_REGION_WEIGHTS, ASIA_REGION_WEIGHTS, EUROPE_REGION_WEIGHTS } from "@shopspy/shared";
import {
  calculateWeightedGlobalScore,
  calculateLatamScore,
  calculateAsiaScore,
  calculateEuropeScore,
} from "../src/regional-score";

function sumWeights(weights: Record<string, number>): number {
  return Object.values(weights).reduce((a, b) => a + b, 0);
}

describe("pesos regionais somam 1.0", () => {
  it("REGION_WEIGHTS", () => {
    expect(sumWeights(REGION_WEIGHTS)).toBeCloseTo(1, 5);
  });
  it("LATAM_REGION_WEIGHTS", () => {
    expect(sumWeights(LATAM_REGION_WEIGHTS)).toBeCloseTo(1, 5);
  });
  it("ASIA_REGION_WEIGHTS", () => {
    expect(sumWeights(ASIA_REGION_WEIGHTS)).toBeCloseTo(1, 5);
  });
  it("EUROPE_REGION_WEIGHTS", () => {
    expect(sumWeights(EUROPE_REGION_WEIGHTS)).toBeCloseTo(1, 5);
  });
});

describe("calculateWeightedGlobalScore", () => {
  it("combina as regiões com REGION_WEIGHTS", () => {
    const score = calculateWeightedGlobalScore({ MX: 100, CO: 0 });
    expect(score).toBeCloseTo(100 * REGION_WEIGHTS.MX, 5);
  });

  it("região ausente conta como 0, não quebra", () => {
    expect(calculateWeightedGlobalScore({})).toBe(0);
  });

  it("score máximo em todas as regiões dá 100 (pesos somam 1.0)", () => {
    const allMax = Object.fromEntries(Object.keys(REGION_WEIGHTS).map((r) => [r, 100]));
    expect(calculateWeightedGlobalScore(allMax)).toBeCloseTo(100, 5);
  });
});

describe("calculateLatamScore", () => {
  it("só considera MX/CO/AR/CL, ignora outras regiões", () => {
    const score = calculateLatamScore({ MX: 80, TH: 100, FR: 100 });
    expect(score).toBeCloseTo(80 * LATAM_REGION_WEIGHTS.MX, 5);
  });
});

describe("calculateAsiaScore", () => {
  it("só considera TH/ID/VN/JP", () => {
    const score = calculateAsiaScore({ TH: 60, MX: 100 });
    expect(score).toBeCloseTo(60 * ASIA_REGION_WEIGHTS.TH, 5);
  });
});

describe("calculateEuropeScore", () => {
  it("média simples entre FR/DE/IT (pesos iguais)", () => {
    const score = calculateEuropeScore({ FR: 30, DE: 60, IT: 90 });
    expect(score).toBeCloseTo(60, 5); // média de 30/60/90
  });
});
