import { describe, expect, it } from "vitest";
import { computeBackoffDelay } from "../src/retryBackoff";

describe("computeBackoffDelay", () => {
  it("1ª tentativa falhou -> espera 5min antes da 2ª", () => {
    expect(computeBackoffDelay(1)).toBe(5 * 60_000);
  });

  it("2ª tentativa falhou -> espera 15min antes da 3ª", () => {
    expect(computeBackoffDelay(2)).toBe(15 * 60_000);
  });

  it("3ª tentativa falhou -> espera 30min", () => {
    expect(computeBackoffDelay(3)).toBe(30 * 60_000);
  });

  it("além da 3ª tentativa, mantém o teto de 30min", () => {
    expect(computeBackoffDelay(10)).toBe(30 * 60_000);
  });
});
