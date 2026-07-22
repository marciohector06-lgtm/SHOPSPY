import { describe, expect, it } from "vitest";
import { estimateWindow } from "../src/window-estimator";

describe("estimateWindow", () => {
  it('gap > 60 + brScore < 20 retorna "2-3 semanas"', () => {
    const result = estimateWindow({ gap: 65, brScore: 10, similarProductsHistoryCount: 0 });
    expect(result.windowLabel).toBe("2-3 semanas");
    expect(result.windowWeeks).toBe(2);
  });

  it('gap > 40 + brScore < 40 retorna "3-5 semanas"', () => {
    const result = estimateWindow({ gap: 45, brScore: 30, similarProductsHistoryCount: 0 });
    expect(result.windowLabel).toBe("3-5 semanas");
  });

  it('gap > 20 + brScore < 60 retorna "1-2 meses"', () => {
    const result = estimateWindow({ gap: 25, brScore: 50, similarProductsHistoryCount: 0 });
    expect(result.windowLabel).toBe("1-2 meses");
  });

  it("produto já saturado retorna janela nula e label 'Chegou tarde'", () => {
    const result = estimateWindow({ gap: 5, brScore: 80, similarProductsHistoryCount: 0 });
    expect(result.windowLabel).toBe("Chegou tarde");
    expect(result.windowWeeks).toBeNull();
  });

  describe("confidence", () => {
    it("high quando há 10+ produtos similares com histórico", () => {
      const result = estimateWindow({ gap: 65, brScore: 10, similarProductsHistoryCount: 15 });
      expect(result.confidence).toBe("high");
    });

    it("medium quando há de 3 a 9 produtos similares", () => {
      const result = estimateWindow({ gap: 65, brScore: 10, similarProductsHistoryCount: 5 });
      expect(result.confidence).toBe("medium");
    });

    it("low quando o produto é novo, sem histórico similar", () => {
      const result = estimateWindow({ gap: 65, brScore: 10, similarProductsHistoryCount: 0 });
      expect(result.confidence).toBe("low");
    });
  });
});
