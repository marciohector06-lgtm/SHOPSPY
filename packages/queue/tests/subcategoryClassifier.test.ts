import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, updateMock, createLogMock, classifySubcategoryMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  updateMock: vi.fn(),
  createLogMock: vi.fn(),
  classifySubcategoryMock: vi.fn(),
}));

vi.mock("@shopspy/database", () => ({
  prisma: {
    product: { findMany: findManyMock, update: updateMock },
    scraperLog: { create: createLogMock },
  },
}));

vi.mock("@shopspy/ai", () => ({
  classifySubcategory: classifySubcategoryMock,
}));

import { runSubcategoryClassifier } from "../src/subcategoryClassifier";

function fakeProduct(overrides: Record<string, unknown> = {}) {
  return { id: "p1", name: "Camisa Polo Masculina", category: "FASHION_MEN", ...overrides };
}

describe("runSubcategoryClassifier", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset().mockResolvedValue({});
    createLogMock.mockReset().mockResolvedValue({});
    classifySubcategoryMock.mockReset();
  });

  it("busca só produtos sem subcategoria ainda", async () => {
    findManyMock.mockResolvedValue([]);

    await runSubcategoryClassifier();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subcategory: null } })
    );
  });

  it("classifica e grava a subcategoria escolhida pela IA", async () => {
    findManyMock.mockResolvedValue([fakeProduct()]);
    classifySubcategoryMock.mockResolvedValue("Camisas e camisetas");

    const result = await runSubcategoryClassifier();

    expect(classifySubcategoryMock).toHaveBeenCalledWith(
      "Camisa Polo Masculina",
      "FASHION_MEN",
      expect.arrayContaining(["Camisas e camisetas"])
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { subcategory: "Camisas e camisetas" },
    });
    expect(result.itemsUpdated).toBe(1);
  });

  it("IA não encontra subcategoria (null): não atualiza o produto", async () => {
    findManyMock.mockResolvedValue([fakeProduct()]);
    classifySubcategoryMock.mockResolvedValue(null);

    const result = await runSubcategoryClassifier();

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
  });

  it("erro num produto não impede os outros — erro fica registrado", async () => {
    findManyMock.mockResolvedValue([fakeProduct({ id: "p1", name: "A" }), fakeProduct({ id: "p2", name: "B" })]);
    classifySubcategoryMock.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce("Camisas e camisetas");

    const result = await runSubcategoryClassifier();

    expect(result.itemsFound).toBe(2);
    expect(result.itemsUpdated).toBe(1);
    expect(result.errors).toEqual([expect.stringContaining("A")]);
  });

  it("categoria sem SUBCATEGORIES conhecida: não chama a IA (lista de candidatos vazia)", async () => {
    findManyMock.mockResolvedValue([fakeProduct({ category: "CATEGORIA_INVALIDA" })]);

    await runSubcategoryClassifier();

    expect(classifySubcategoryMock).toHaveBeenCalledWith("Camisa Polo Masculina", "CATEGORIA_INVALIDA", []);
  });

  it("grava ScraperLog de sucesso quando não há erro", async () => {
    findManyMock.mockResolvedValue([fakeProduct()]);
    classifySubcategoryMock.mockResolvedValue("Camisas e camisetas");

    await runSubcategoryClassifier();

    expect(createLogMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: "SUBCATEGORY_CLASSIFIER", region: "GLOBAL", status: "success" }),
    });
  });

  it("grava ScraperLog de erro se a busca dos produtos falhar (não engole a exceção)", async () => {
    findManyMock.mockRejectedValue(new Error("conexão perdida"));

    await expect(runSubcategoryClassifier()).rejects.toThrow("conexão perdida");

    expect(createLogMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: "SUBCATEGORY_CLASSIFIER", status: "error" }),
    });
  });
});
