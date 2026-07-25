import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, updateMock, findSemanticMatchMock, fetchJsonMock, isPathAllowedMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
  findSemanticMatchMock: vi.fn(),
  fetchJsonMock: vi.fn(),
  isPathAllowedMock: vi.fn(),
}));

vi.mock("@shopspy/database", () => ({
  prisma: {
    product: { findMany: findManyMock, update: updateMock },
    scraperLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("@shopspy/ai", () => ({ findSemanticMatch: findSemanticMatchMock }));
vi.mock("../src/shared/http", () => ({ fetchJson: fetchJsonMock }));
vi.mock("../src/shared/robots", () => ({ isPathAllowed: isPathAllowedMock }));
// Evita o delay real de SOURCE_MIN_DELAY_MS.SHOPEE_BR (3s) entre produtos no teste.
vi.mock("../src/shared/rateLimiter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/shared/rateLimiter")>();
  return { ...actual, RateLimiter: class { async wait() {} } };
});

import { extractMainKeyword, matchProductsWithBR } from "../src/brazil/br-product-matcher";

describe("extractMainKeyword", () => {
  it("remove palavras genéricas e mantém até 3 palavras do núcleo", () => {
    expect(extractMainKeyword("Premium Portable Blender Professional")).toBe("portable blender");
  });

  it("ignora palavras com 3 letras ou menos", () => {
    expect(extractMainKeyword("The Big LED Face Mask")).toBe("face mask");
  });

  it("já minúsculo, sem palavra genérica pra remover", () => {
    expect(extractMainKeyword("wireless bluetooth headphones extra")).toBe("wireless bluetooth headphones");
  });
});

describe("matchProductsWithBR", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset().mockResolvedValue({});
    findSemanticMatchMock.mockReset();
    fetchJsonMock.mockReset();
    isPathAllowedMock.mockReset().mockResolvedValue(true);
  });

  function fakeGlobalProduct(overrides: Record<string, unknown> = {}) {
    return {
      id: "p1",
      name: "Portable Blender",
      nameEn: "Portable Blender",
      externalIds: { amazonUS: "B001" },
      ...overrides,
    };
  }

  it("busca só produtos globais sem par BR (firstSeenUS preenchido, firstSeenBR vazio)", async () => {
    findManyMock.mockResolvedValue([]);

    await matchProductsWithBR();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { firstSeenUS: { not: null }, firstSeenBR: null } })
    );
  });

  it("match confirmado pelo Gemini: atualiza priceBR/soldCountBR/ratingBR/externalIds.shopee", async () => {
    findManyMock.mockResolvedValue([fakeGlobalProduct()]);
    fetchJsonMock.mockResolvedValue({
      items: [{ item_basic: { itemid: 1, shopid: 2, name: "Liquidificador Portátil", price: 8990000, historical_sold: 500, item_rating: { rating_star: 4.5 } } }],
    });
    findSemanticMatchMock.mockResolvedValue(0); // primeiro (e único) candidato é o match

    const result = await matchProductsWithBR();

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: {
        priceBR: 89.9,
        soldCountBR: 500,
        ratingBR: 4.5,
        firstSeenBR: expect.any(Date),
        externalIds: { amazonUS: "B001", shopee: "2_1" },
      },
    });
    expect(result.itemsUpdated).toBe(1);
  });

  it("Gemini não encontra match (-1): não atualiza o produto", async () => {
    findManyMock.mockResolvedValue([fakeGlobalProduct()]);
    fetchJsonMock.mockResolvedValue({
      items: [{ item_basic: { itemid: 1, shopid: 2, name: "Produto Sem Relação", price: 1000000 } }],
    });
    findSemanticMatchMock.mockResolvedValue(-1);

    const result = await matchProductsWithBR();

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
  });

  it("Shopee não retorna candidato nenhum: não chama o Gemini, não atualiza", async () => {
    findManyMock.mockResolvedValue([fakeGlobalProduct()]);
    fetchJsonMock.mockResolvedValue({ items: [] });

    const result = await matchProductsWithBR();

    expect(findSemanticMatchMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
  });

  it("robots.txt bloqueia a busca: não chama a Shopee, não quebra o restante do lote", async () => {
    findManyMock.mockResolvedValue([fakeGlobalProduct()]);
    isPathAllowedMock.mockResolvedValue(false);

    const result = await matchProductsWithBR();

    expect(fetchJsonMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(result.errors).toHaveLength(0);
  });

  it("erro num produto não impede os outros — erro fica registrado", async () => {
    findManyMock.mockResolvedValue([fakeGlobalProduct({ id: "p1", name: "A" }), fakeGlobalProduct({ id: "p2", name: "B" })]);
    fetchJsonMock.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce({ items: [] });

    const result = await matchProductsWithBR();

    expect(result.itemsFound).toBe(2);
    expect(result.errors).toEqual([expect.stringContaining("A")]);
  });
});
