import { beforeEach, describe, expect, it } from "vitest";
import { scoreProduct } from "../src/index";
import { PRODUCT_FIXTURES } from "./fixtures/products";

// Sem GEMINI_API_KEY, opportunityText sempre vem "" (fallback da Fase 4) —
// o que torna o snapshot 100% determinístico, sem depender de rede.
beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
});

describe("Score Engine — snapshot de 15 produtos com perfis conhecidos", () => {
  it("mantém scoreTotal, classification, window e ugcDifficulty estáveis entre versões", async () => {
    const results: Record<string, unknown> = {};
    for (const fixture of PRODUCT_FIXTURES) {
      const result = await scoreProduct(fixture.input);
      results[fixture.label] = {
        scoreTotal: Math.round(result.scoreTotal * 100) / 100,
        classification: result.classification,
        gap: Math.round(result.gap * 100) / 100,
        windowWeeks: result.windowWeeks,
        windowLabel: result.windowLabel,
        windowConfidence: result.windowConfidence,
        ugcDifficulty: result.ugcDifficulty,
        opportunityText: result.opportunityText,
      };
    }

    expect(results).toMatchSnapshot();
  });

  it("cobre as 15 fixtures (nenhuma foi removida sem querer)", () => {
    expect(PRODUCT_FIXTURES.length).toBeGreaterThanOrEqual(15);
  });

  it("produtos com 'biquíni' ou 'lingerie' no nome sempre viram ugcDifficulty=hard", async () => {
    const biquini = await scoreProduct(
      PRODUCT_FIXTURES.find((f) => f.label === "biquini-viral-eua-ugc-dificil")!.input
    );
    const lingerie = await scoreProduct(
      PRODUCT_FIXTURES.find((f) => f.label === "lingerie-tendencia-ugc-dificil")!.input
    );
    expect(biquini.ugcDifficulty).toBe("hard");
    expect(lingerie.ugcDifficulty).toBe("hard");
  });
});
