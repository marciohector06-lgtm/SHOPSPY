import { describe, expect, it } from "vitest";
import { classifyUGCDifficulty } from "../src/ugc-classifier";

describe("classifyUGCDifficulty", () => {
  it("categoria de limpeza/organização é 'easy' (só mãos, sem rosto)", () => {
    expect(classifyUGCDifficulty("Esponja Multiuso 3 em 1", "HOME_CLEANING").difficulty).toBe("easy");
  });

  it("categoria de beleza é 'medium'", () => {
    expect(classifyUGCDifficulty("Sérum Facial Vitamina C", "BEAUTY_SKINCARE").difficulty).toBe("medium");
  });

  it("categoria de moda feminina genérica é 'hard'", () => {
    expect(classifyUGCDifficulty("Vestido Longo Floral", "FASHION_WOMEN").difficulty).toBe("hard");
  });

  it("palavra-chave 'biquíni' força 'hard' mesmo que a categoria fosse mais fácil", () => {
    // ACCESSORIES normalmente dá score alto (78, 'medium'), mas biquíni exige alguém vestindo
    const result = classifyUGCDifficulty("Biquíni Cortininha Estampado", "ACCESSORIES");
    expect(result.difficulty).toBe("hard");
    expect(result.score).toBeLessThan(60);
  });

  it("palavra-chave 'lingerie' força 'hard'", () => {
    expect(classifyUGCDifficulty("Conjunto Lingerie Renda", "FASHION_WOMEN").difficulty).toBe("hard");
  });

  it("não confunde produto sem as palavras-chave sensíveis (falso positivo)", () => {
    const result = classifyUGCDifficulty("Organizador de Gaveta Multiuso", "HOME_ORGANIZATION");
    expect(result.difficulty).toBe("easy");
  });
});
