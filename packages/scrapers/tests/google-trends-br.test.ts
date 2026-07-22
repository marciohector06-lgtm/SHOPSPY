import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGoogleTrendsResponse, chunkKeywords } from "../src/brazil/google-trends-br";

const rawFixture = readFileSync(join(__dirname, "fixtures/google-trends-interest.json"), "utf-8");

describe("Google Trends BR scraper — parseGoogleTrendsResponse", () => {
  it("extrai score atual, variação semanal e pico de um JSON real da lib", () => {
    const summary = parseGoogleTrendsResponse(rawFixture);
    expect(summary.currentScore).toBe(45);
    expect(summary.peakScore).toBe(45);
    expect(summary.weeklyChangePct).toBeCloseTo(150, 0); // (45-18)/18 * 100
  });

  it("retorna zeros para série vazia", () => {
    const empty = JSON.stringify({ default: { timelineData: [] } });
    expect(parseGoogleTrendsResponse(empty)).toEqual({
      currentScore: 0,
      weeklyChangePct: 0,
      peakScore: 0,
    });
  });

  it("não quebra quando o valor anterior é zero", () => {
    const raw = JSON.stringify({
      default: {
        timelineData: [
          { time: "1", value: [0] },
          { time: "2", value: [10] },
        ],
      },
    });
    const summary = parseGoogleTrendsResponse(raw);
    expect(summary.weeklyChangePct).toBe(100);
  });
});

describe("chunkKeywords", () => {
  it("divide em lotes de 5", () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    const chunks = chunkKeywords(items, 5);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(5);
    expect(chunks[2]).toHaveLength(2);
  });

  it("retorna array vazio para entrada vazia", () => {
    expect(chunkKeywords([], 5)).toEqual([]);
  });
});
