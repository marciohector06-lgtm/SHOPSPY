import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, GLOBAL_TRENDS_WEIGHTS } from "@shopspy/shared";

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
