import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, GLOBAL_TRENDS_WEIGHTS, SUBCATEGORIES, CATEGORIES } from "@shopspy/shared";

describe("SCORE_WEIGHTS", () => {
  it("sums to 1.0", () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

describe("GLOBAL_TRENDS_WEIGHTS", () => {
  it("sums to 1.0", () => {
    const sum = Object.values(GLOBAL_TRENDS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

describe("SUBCATEGORIES", () => {
  it("tem uma entrada para cada uma das 15 categorias", () => {
    expect(Object.keys(SUBCATEGORIES).sort()).toEqual([...CATEGORIES].sort());
  });

  it("nenhuma categoria fica sem subcategoria", () => {
    for (const category of CATEGORIES) {
      expect(SUBCATEGORIES[category].length).toBeGreaterThan(0);
    }
  });

  it("nenhum nome de subcategoria se repete dentro da mesma categoria", () => {
    for (const category of CATEGORIES) {
      const names = SUBCATEGORIES[category];
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
