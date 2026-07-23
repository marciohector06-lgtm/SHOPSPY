import { beforeEach, describe, expect, it, vi } from "vitest";

const { productFindManyMock, trendScoreFindManyMock, trendScoreUpsertMock, scraperLogCreateMock } = vi.hoisted(
  () => ({
    productFindManyMock: vi.fn(),
    trendScoreFindManyMock: vi.fn(),
    trendScoreUpsertMock: vi.fn(),
    scraperLogCreateMock: vi.fn(),
  })
);

vi.mock("@shopspy/database", () => ({
  prisma: {
    product: { findMany: productFindManyMock },
    trendScore: { findMany: trendScoreFindManyMock, upsert: trendScoreUpsertMock },
    scraperLog: { create: scraperLogCreateMock },
  },
}));

import { runScoreCalculator } from "../src/scoreCalculator";

function fakeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Fone de Ouvido Bluetooth TWS",
    category: "ELECTRONICS_GADGETS",
    amazonRankUS: 1,
    amazonRankUK: null,
    commissionPctBR: null,
    ratingBR: null,
    soldCountBR: null,
    creatorVideosBR: null,
    ...overrides,
  };
}

describe("runScoreCalculator — integração com @shopspy/scorer", () => {
  beforeEach(() => {
    productFindManyMock.mockReset();
    trendScoreFindManyMock.mockReset().mockResolvedValue([]);
    trendScoreUpsertMock.mockReset().mockResolvedValue({});
    scraperLogCreateMock.mockReset().mockResolvedValue({});
  });

  it("pontua produto com rank Amazon usando o Score Engine real e grava em TrendScore com scoreTotal > 0", async () => {
    productFindManyMock.mockResolvedValue([fakeProduct()]);

    const result = await runScoreCalculator();

    expect(trendScoreUpsertMock).toHaveBeenCalledTimes(1);
    const call = trendScoreUpsertMock.mock.calls[0]![0];
    expect(call.where).toEqual({
      productId_weekNumber_year: expect.objectContaining({ productId: "p1" }),
    });
    expect(call.create.scoreTotal).toBeGreaterThan(0);
    expect(call.create.classification).toBeTruthy();
    expect(result.itemsNew).toBe(1);
    expect(result.itemsFound).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("busca só produtos com amazonRankUS OU amazonRankUK preenchido", async () => {
    productFindManyMock.mockResolvedValue([]);

    await runScoreCalculator();

    expect(productFindManyMock).toHaveBeenCalledWith({
      where: { OR: [{ amazonRankUS: { not: null } }, { amazonRankUK: { not: null } }] },
    });
  });

  it("rank melhor (menor número) produz score/índice global maior que rank pior", async () => {
    productFindManyMock.mockResolvedValue([
      fakeProduct({ id: "p1", amazonRankUS: 1 }),
      fakeProduct({ id: "p2", amazonRankUS: 55 }),
    ]);

    await runScoreCalculator();

    const scores = trendScoreUpsertMock.mock.calls.map((call) => call[0].create);
    const top = scores.find((s) => s.productId === "p1")!;
    const bottom = scores.find((s) => s.productId === "p2")!;
    expect(top.trendsUS).toBeGreaterThan(bottom.trendsUS);
    expect(top.scoreTotal).toBeGreaterThan(bottom.scoreTotal);
  });

  it("uma falha ao pontuar um produto não impede os outros — erro fica registrado, resto continua", async () => {
    productFindManyMock.mockResolvedValue([fakeProduct({ id: "p1" }), fakeProduct({ id: "p2" })]);
    trendScoreUpsertMock.mockRejectedValueOnce(new Error("banco indisponível")).mockResolvedValueOnce({});

    const result = await runScoreCalculator();

    expect(result.itemsNew).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("p1");
  });

  it("sem histórico prévio (primeira coleta): weeklyChange cai em 0 (neutro), nunca inventa variação", async () => {
    productFindManyMock.mockResolvedValue([fakeProduct()]);
    trendScoreFindManyMock.mockResolvedValue([]); // nenhum score anterior

    await runScoreCalculator();

    const created = trendScoreUpsertMock.mock.calls[0]![0].create;
    expect(created.weeklyChangeUS).toBe(0);
    expect(created.weeklyChangeBR).toBe(0);
  });

  it("grava um ScraperLog com source SCORE_CALCULATOR ao terminar — pra aparecer em /health", async () => {
    productFindManyMock.mockResolvedValue([fakeProduct()]);

    await runScoreCalculator();

    expect(scraperLogCreateMock).toHaveBeenCalledTimes(1);
    const log = scraperLogCreateMock.mock.calls[0]![0].data;
    expect(log.source).toBe("SCORE_CALCULATOR");
    expect(log.region).toBe("GLOBAL");
    expect(log.status).toBe("success");
    expect(log.itemsFound).toBe(1);
  });

  it("se o cálculo lançar antes de terminar, grava ScraperLog com status error e propaga o erro", async () => {
    productFindManyMock.mockRejectedValue(new Error("banco indisponível"));

    await expect(runScoreCalculator()).rejects.toThrow("banco indisponível");

    expect(scraperLogCreateMock).toHaveBeenCalledTimes(1);
    const log = scraperLogCreateMock.mock.calls[0]![0].data;
    expect(log.source).toBe("SCORE_CALCULATOR");
    expect(log.status).toBe("error");
    expect(log.error).toContain("banco indisponível");
  });
});
