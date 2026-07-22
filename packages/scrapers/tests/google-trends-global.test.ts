import { describe, expect, it } from "vitest";
import {
  computeGlobalTrendsIndex,
  computeGap,
  type GlobalTrendsBreakdown,
} from "../src/global/google-trends-global";

function summary(currentScore: number): GlobalTrendsBreakdown["US"] {
  return { currentScore, weeklyChangePct: 0, peakScore: currentScore };
}

describe("computeGlobalTrendsIndex", () => {
  it("aplica os pesos US 40% / UK 25% / AU 20% / CA 15%", () => {
    const breakdown: GlobalTrendsBreakdown = {
      US: summary(100),
      UK: summary(80),
      AU: summary(60),
      CA: summary(40),
    };
    // 100*0.4 + 80*0.25 + 60*0.2 + 40*0.15 = 40 + 20 + 12 + 6 = 78
    expect(computeGlobalTrendsIndex(breakdown)).toBeCloseTo(78, 5);
  });

  it("retorna 0 quando todas as regiões estão zeradas", () => {
    const breakdown: GlobalTrendsBreakdown = {
      US: summary(0),
      UK: summary(0),
      AU: summary(0),
      CA: summary(0),
    };
    expect(computeGlobalTrendsIndex(breakdown)).toBe(0);
  });
});

describe("computeGap", () => {
  it("gap alto indica oportunidade máxima (US crescendo, BR ainda não descobriu)", () => {
    expect(computeGap(85, 5)).toBe(80);
  });

  it("gap baixo/negativo indica que chegou tarde (BR já saturado)", () => {
    expect(computeGap(60, 75)).toBe(-15);
  });
});
