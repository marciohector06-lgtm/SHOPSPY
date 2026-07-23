// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ProductDetail } from "../src/lib/types";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const { fetchProductsMock } = vi.hoisted(() => ({ fetchProductsMock: vi.fn() }));
vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return { ...actual, fetchProducts: fetchProductsMock };
});

import { ProductsTable } from "../src/components/ProductsTable";

function fakeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    name: "Fone de Ouvido Bluetooth TWS",
    nameEn: null,
    category: "ELECTRONICS_GADGETS",
    subcategory: null,
    imageUrl: null,
    status: "MONITORING",
    priceBR: null,
    commissionPctBR: null,
    commissionValueBR: 25,
    soldCountBR: 100,
    ratingBR: null,
    searchesBR: null,
    creatorVideosBR: null,
    priceUS: null,
    soldCountUS: null,
    amazonRankUS: 5,
    amazonRankUK: null,
    tiktokImpressions: null,
    tiktokCTR: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: [
      {
        id: "s1",
        scoreTotal: 60,
        classification: "MEDIUM",
        trendsUS: 50,
        trendsBR: 0,
        gap: 50,
        weeklyChangeUS: 0,
        weeklyChangeBR: 0,
        windowWeeks: 3,
        windowLabel: "2-3 semanas",
        weekNumber: 1,
        year: 2026,
        createdAt: new Date().toISOString(),
      },
    ],
    videos: [],
    ...overrides,
  };
}

const PRODUCTS = [
  fakeProduct({ id: "p-low", name: "Produto Baixo Score", category: "PETS", scores: [{ id: "s-low", scoreTotal: 30, classification: "AVOID", trendsUS: 10, trendsBR: 0, gap: 10, weeklyChangeUS: 0, weeklyChangeBR: 0, windowWeeks: null, windowLabel: null, weekNumber: 1, year: 2026, createdAt: new Date().toISOString() }] }),
  fakeProduct({ id: "p-high", name: "Produto Alto Score", category: "ELECTRONICS_GADGETS", scores: [{ id: "s-high", scoreTotal: 90, classification: "MAXIMUM", trendsUS: 95, trendsBR: 0, gap: 95, weeklyChangeUS: 0, weeklyChangeBR: 0, windowWeeks: 2, windowLabel: "2 semanas", weekNumber: 1, year: 2026, createdAt: new Date().toISOString() }] }),
];

function rowNames() {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1).map((row) => row.textContent);
}

describe("<ProductsTable />", () => {
  beforeEach(() => {
    pushMock.mockReset();
    fetchProductsMock.mockReset();
  });

  it("ordena por score decrescente por padrão", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    const names = rowNames();
    expect(names[0]).toContain("Produto Alto Score");
    expect(names[1]).toContain("Produto Baixo Score");
  });

  it("filtra por categoria sem novo fetch", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    fireEvent.change(screen.getByDisplayValue("Categoria: todas"), { target: { value: "PETS" } });
    const names = rowNames();
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("Produto Baixo Score");
    expect(fetchProductsMock).not.toHaveBeenCalled();
  });

  it("busca por nome (case-insensitive)", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    fireEvent.change(screen.getByPlaceholderText(/Buscar produto/), { target: { value: "alto" } });
    expect(rowNames()).toHaveLength(1);
  });

  it("filtra por score mínimo", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    fireEvent.change(screen.getByDisplayValue("Score mín.: qualquer"), { target: { value: "65" } });
    const names = rowNames();
    expect(names).toHaveLength(1);
    expect(names[0]).toContain("Produto Alto Score");
  });

  it("clicar no cabeçalho 'Produto' ordena por nome (1º clique = desc, como qualquer coluna nova)", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    fireEvent.click(within(screen.getByRole("table")).getByText("Produto"));
    const names = rowNames();
    expect(names[0]).toContain("Produto Baixo Score"); // "Baixo" > "Alto" em ordem desc
  });

  it("2º clique no mesmo cabeçalho inverte pra asc", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    const header = within(screen.getByRole("table")).getByText("Produto");
    fireEvent.click(header);
    fireEvent.click(header);
    const names = rowNames();
    expect(names[0]).toContain("Produto Alto Score");
  });

  it("nenhum resultado: EmptyState em vez de tabela vazia", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    fireEvent.change(screen.getByPlaceholderText(/Buscar produto/), { target: { value: "produto que não existe" } });
    expect(screen.getByText("Nenhum produto encontrado")).toBeTruthy();
  });

  it("clicar na linha navega pro produto (router.push)", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    fireEvent.click(within(screen.getByRole("table")).getByText("Produto Alto Score"));
    expect(pushMock).toHaveBeenCalledWith("/produto/p-high");
  });

  it("clicar em 'Roteiro UGC' abre o modal e NÃO navega (stopPropagation)", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    const buttons = screen.getAllByText("Roteiro UGC");
    fireEvent.click(buttons[0]!);
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("sem cursor: não mostra o botão 'Carregar mais 50'", () => {
    render(<ProductsTable initialItems={PRODUCTS} initialCursor={null} />);
    expect(screen.queryByText("Carregar mais 50")).toBeNull();
  });

  it("'Carregar mais 50' busca a próxima página via cursor e concatena (sem refazer o fetch inicial)", async () => {
    fetchProductsMock.mockResolvedValue({ items: [fakeProduct({ id: "p-new", name: "Produto Novo Carregado" })], nextCursor: null });
    render(<ProductsTable initialItems={PRODUCTS} initialCursor="cursor-1" />);

    fireEvent.click(screen.getByText("Carregar mais 50"));

    await within(screen.getByRole("table")).findByText("Produto Novo Carregado");
    expect(fetchProductsMock).toHaveBeenCalledWith({ cursor: "cursor-1", limit: 50 });
    expect(screen.queryByText("Carregar mais 50")).toBeNull(); // nextCursor veio null
  });
});
