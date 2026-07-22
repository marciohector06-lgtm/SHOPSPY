import { describe, expect, it } from "vitest";
import { classify, computeGap } from "../src/gap-analyzer";

describe("computeGap", () => {
  it("gap positivo quando o global está mais quente que o BR", () => {
    expect(computeGap(80, 20)).toBe(60);
  });

  it("gap negativo quando o BR já ultrapassou o global", () => {
    expect(computeGap(40, 70)).toBe(-30);
  });
});

describe("classify — lógica de cruzamento global → Brasil", () => {
  it("MAXIMUM: score global alto + BR quase sem equivalente", () => {
    expect(
      classify({ scoreTotal: 90, globalScore: 85, brScore: 5, weeklyChangeUS: 50, weeklyChangeBR: 0 })
    ).toBe("MAXIMUM");
  });

  it("HIGH: score global alto + BR ainda fraco", () => {
    expect(
      classify({ scoreTotal: 70, globalScore: 80, brScore: 30, weeklyChangeUS: 40, weeklyChangeBR: 5 })
    ).toBe("HIGH");
  });

  it("SATURATING: BR já alto, mesmo com score global também alto (chegou tarde)", () => {
    expect(
      classify({ scoreTotal: 75, globalScore: 85, brScore: 80, weeklyChangeUS: 30, weeklyChangeBR: 10 })
    ).toBe("SATURATING");
  });

  it("MEDIUM: score global médio + BR crescendo", () => {
    expect(
      classify({ scoreTotal: 55, globalScore: 60, brScore: 45, weeklyChangeUS: 10, weeklyChangeBR: 15 })
    ).toBe("MEDIUM");
  });

  it("AVOID: score global caindo + BR saturado", () => {
    expect(
      classify({ scoreTotal: 20, globalScore: 30, brScore: 75, weeklyChangeUS: -20, weeklyChangeBR: -5 })
    ).toBe("AVOID");
  });

  it("desempate pelo score ponderado quando nenhuma regra categórica bate", () => {
    expect(
      classify({ scoreTotal: 68, globalScore: 45, brScore: 45, weeklyChangeUS: 5, weeklyChangeBR: -2 })
    ).toBe("HIGH");
  });
});
