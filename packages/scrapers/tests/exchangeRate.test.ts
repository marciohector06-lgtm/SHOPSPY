import { describe, expect, it } from "vitest";
import { convertUsdToBrl } from "../src/shared/exchangeRate";

describe("convertUsdToBrl", () => {
  it("converte usando a cotação informada", () => {
    expect(convertUsdToBrl(10, 5.2)).toBe(52);
  });

  it("arredonda para 2 casas decimais", () => {
    expect(convertUsdToBrl(9.99, 5.137)).toBeCloseTo(51.32, 2);
  });
});
