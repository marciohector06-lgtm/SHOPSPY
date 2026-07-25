import { beforeEach, describe, expect, it, vi } from "vitest";

const { productFindManyMock, regionalScoreFindUniqueMock, regionalScoreUpsertMock, scraperLogCreateMock, fetchTrendsSummaryMock } =
  vi.hoisted(() => ({
    productFindManyMock: vi.fn(),
    regionalScoreFindUniqueMock: vi.fn(),
    regionalScoreUpsertMock: vi.fn(),
    scraperLogCreateMock: vi.fn(),
    fetchTrendsSummaryMock: vi.fn(),
  }));

vi.mock("@shopspy/database", () => ({
  prisma: {
    product: { findMany: productFindManyMock },
    regionalScore: { findUnique: regionalScoreFindUniqueMock, upsert: regionalScoreUpsertMock },
    scraperLog: { create: scraperLogCreateMock },
  },
}));

vi.mock("../src/shared/trends", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/shared/trends")>();
  return { ...actual, fetchTrendsSummary: fetchTrendsSummaryMock, sleep: () => Promise.resolve() };
});

import { runGoogleTrendsInternationalScraper } from "../src/global/google-trends-international";

describe("runGoogleTrendsInternationalScraper", () => {
  beforeEach(() => {
    productFindManyMock.mockReset().mockResolvedValue([{ id: "p1", name: "Produto X", nameEn: "Product X" }]);
    regionalScoreFindUniqueMock.mockReset().mockResolvedValue(null);
    regionalScoreUpsertMock.mockReset().mockResolvedValue({});
    scraperLogCreateMock.mockReset().mockResolvedValue({});
    fetchTrendsSummaryMock.mockReset().mockResolvedValue({ currentScore: 40, weeklyChangePct: 10, peakScore: 40 });
  });

  it("busca as 11 regiões internacionais por produto monitorado", async () => {
    await runGoogleTrendsInternationalScraper();

    expect(fetchTrendsSummaryMock).toHaveBeenCalledTimes(11);
    expect(regionalScoreUpsertMock).toHaveBeenCalledTimes(11);
  });

  it("weeklyGrowth abaixo do limiar: isExplosive fica false", async () => {
    fetchTrendsSummaryMock.mockResolvedValue({ currentScore: 40, weeklyChangePct: 150, peakScore: 40 });

    await runGoogleTrendsInternationalScraper();

    const call = regionalScoreUpsertMock.mock.calls[0]![0];
    expect(call.create.isExplosive).toBe(false);
    expect(call.create.weeklyGrowth).toBe(150);
  });

  it("weeklyGrowth no limiar (>=200%): isExplosive fica true", async () => {
    fetchTrendsSummaryMock.mockResolvedValue({ currentScore: 70, weeklyChangePct: 220, peakScore: 70 });

    await runGoogleTrendsInternationalScraper();

    const call = regionalScoreUpsertMock.mock.calls[0]![0];
    expect(call.create.isExplosive).toBe(true);
    expect(call.create.trendScore).toBe(70);
  });

  it("upsert usa a chave composta productId_region_weekNumber_year", async () => {
    await runGoogleTrendsInternationalScraper();

    const call = regionalScoreUpsertMock.mock.calls[0]![0];
    expect(call.where.productId_region_weekNumber_year).toMatchObject({ productId: "p1" });
    expect(call.create).toMatchObject({ productId: "p1" });
  });

  it("falha numa região não impede as outras — erro fica registrado", async () => {
    fetchTrendsSummaryMock
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValue({ currentScore: 30, weeklyChangePct: 5, peakScore: 30 });

    const result = await runGoogleTrendsInternationalScraper();

    expect(result.errors).toHaveLength(1);
    expect(regionalScoreUpsertMock).toHaveBeenCalledTimes(10); // 11 regiões - 1 que falhou
  });
});
