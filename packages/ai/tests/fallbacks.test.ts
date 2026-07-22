import { beforeEach, describe, expect, it } from "vitest";
import { extractHook } from "../src/hook-extractor";
import { generateUGCScript } from "../src/script-generator";
import { analyzeOpportunity } from "../src/opportunity-analyst";
import { translateProductNameToPT, findSemanticMatch } from "../src/keyword-normalizer";

// Sem GEMINI_API_KEY configurada, todo caminho deve degradar para o fallback
// de domínio em vez de lançar — essa é a garantia central da Fase 4
// ("nunca quebrar o pipeline por causa da IA").
beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
});

describe("fallbacks quando o Gemini está indisponível", () => {
  it("extractHook retorna campos vazios", async () => {
    const result = await extractHook("título", "descrição");
    expect(result).toEqual({ hook: "", hookType: null, visualAction: "", ugcFriendly: false });
  });

  it("generateUGCScript retorna roteiro vazio com durações padrão", async () => {
    const result = await generateUGCScript({
      name: "Produto X",
      priceBR: 49.9,
      commissionValueBR: 10,
      ratingBR: 4.5,
      soldCountBR: 100,
    });
    expect(result.hook).toEqual({ text: "", visual: "", duration: "0-3s" });
    expect(result.flowPrompts).toEqual([]);
    expect(result.hashtags).toEqual([]);
  });

  it("analyzeOpportunity retorna string vazia", async () => {
    const result = await analyzeOpportunity({
      name: "Produto X",
      weeklyChangeUS: 340,
      searchesBR: 100,
      gap: 60,
      commissionValueBR: 22,
      soldCountBR: 1000,
      windowLabel: "2-3 semanas",
    });
    expect(result).toBe("");
  });

  it("translateProductNameToPT retorna o nome original em inglês", async () => {
    const result = await translateProductNameToPT("Portable Neck Fan");
    expect(result).toBe("Portable Neck Fan");
  });

  it("findSemanticMatch retorna -1", async () => {
    const result = await findSemanticMatch("Portable Neck Fan", ["ventilador de mesa", "fone bluetooth"]);
    expect(result).toBe(-1);
  });

  it("findSemanticMatch retorna -1 imediatamente para lista vazia (sem nem chamar o Gemini)", async () => {
    const result = await findSemanticMatch("Portable Neck Fan", []);
    expect(result).toBe(-1);
  });
});
