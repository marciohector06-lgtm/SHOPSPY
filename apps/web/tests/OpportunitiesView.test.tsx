// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ProductDetail, TrendScoreEntry } from "../src/lib/types";
import { OpportunitiesView } from "../src/components/OpportunitiesView";

let observerCallback: IntersectionObserverCallback | null = null;

class FakeIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
  observe() {}
  disconnect() {}
}

vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

function fakeScore(overrides: Partial<TrendScoreEntry> = {}): TrendScoreEntry {
  return {
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
    ...overrides,
  };
}

function fakeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    name: "Produto Genérico",
    nameEn: null,
    category: "ELECTRONICS_GADGETS",
    subcategory: null,
    imageUrl: null,
    status: "MONITORING",
    priceBR: null,
    commissionPctBR: null,
    commissionValueBR: 30,
    soldCountBR: null,
    ratingBR: null,
    searchesBR: null,
    creatorVideosBR: null,
    priceUS: null,
    soldCountUS: null,
    amazonRankUS: null,
    amazonRankUK: null,
    tiktokImpressions: null,
    tiktokCTR: null,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias atrás, não é NOVO
    updatedAt: new Date().toISOString(),
    scores: [fakeScore()],
    videos: [],
    ...overrides,
  };
}

describe("<OpportunitiesView /> — PRO", () => {
  beforeEach(() => {
    observerCallback = null;
  });

  it("filtra por classificação (botão toggle) sem novo fetch", () => {
    const items = [
      fakeProduct({ id: "p-max", name: "Produto Máximo", scores: [fakeScore({ classification: "MAXIMUM" })] }),
      fakeProduct({ id: "p-avoid", name: "Produto Evitar", scores: [fakeScore({ classification: "AVOID" })] }),
    ];
    render(<OpportunitiesView items={items} isFree={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Máxima" }));
    expect(screen.getByText("Produto Máximo")).toBeTruthy();
    expect(screen.queryByText("Produto Evitar")).toBeNull();
  });

  it("'Todas' limpa o filtro de classificação", () => {
    const items = [
      fakeProduct({ id: "p-max", name: "Produto Máximo", scores: [fakeScore({ classification: "MAXIMUM" })] }),
      fakeProduct({ id: "p-avoid", name: "Produto Evitar", scores: [fakeScore({ classification: "AVOID" })] }),
    ];
    render(<OpportunitiesView items={items} isFree={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Máxima" }));
    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getByText("Produto Máximo")).toBeTruthy();
    expect(screen.getByText("Produto Evitar")).toBeTruthy();
  });

  it("ordena por comissão quando 'Maior comissão primeiro' é escolhido", () => {
    const items = [
      fakeProduct({ id: "p-low", name: "Produto Baixa Comissão", commissionValueBR: 5 }),
      fakeProduct({ id: "p-high", name: "Produto Alta Comissão", commissionValueBR: 500 }),
    ];
    render(<OpportunitiesView items={items} isFree={false} />);

    fireEvent.change(screen.getByDisplayValue("Score (maior primeiro)"), { target: { value: "commission" } });

    const names = screen.getAllByText(/Produto (Baixa|Alta) Comissão/).map((el) => el.textContent);
    expect(names[0]).toBe("Produto Alta Comissão");
  });

  it("nenhum resultado após filtro: EmptyState, não tela vazia", () => {
    const items = [fakeProduct({ scores: [fakeScore({ classification: "MAXIMUM" })] })];
    render(<OpportunitiesView items={items} isFree={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Evitar" }));
    expect(screen.getByText("Nenhuma oportunidade encontrada")).toBeTruthy();
  });

  it("revela só 20 inicialmente e mais 20 quando o sentinela intersecta (infinite scroll)", () => {
    const items = Array.from({ length: 45 }, (_, i) => fakeProduct({ id: `p${i}`, name: `Produto ${i}` }));
    render(<OpportunitiesView items={items} isFree={false} />);

    expect(screen.getByText("Produto 19")).toBeTruthy();
    expect(screen.queryByText("Produto 20")).toBeNull();

    act(() => {
      observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(screen.getByText("Produto 20")).toBeTruthy();
    expect(screen.getByText("Produto 39")).toBeTruthy();
    expect(screen.queryByText("Produto 40")).toBeNull();
  });

  it("badge NOVO aparece só pra produto criado nas últimas 48h", () => {
    const items = [
      fakeProduct({ id: "p-old", name: "Produto Antigo" }),
      fakeProduct({ id: "p-new", name: "Produto Recente", createdAt: new Date().toISOString() }),
    ];
    render(<OpportunitiesView items={items} isFree={false} />);
    expect(screen.getAllByText("NOVO")).toHaveLength(1);
  });

  it("clicar em 'Roteiro UGC' abre o modal", () => {
    const items = [fakeProduct({ name: "Produto Com Roteiro" })];
    render(<OpportunitiesView items={items} isFree={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Roteiro UGC/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

describe("<OpportunitiesView /> — FREE", () => {
  it("mostra o badge PRÉVIA, os produtos reais (delayedAt), e o teaser borrado com upgrade — sem filtros", () => {
    const items = [fakeProduct({ name: "Produto Prévia 1" }), fakeProduct({ name: "Produto Prévia 2" })];
    render(<OpportunitiesView items={items} isFree />);

    expect(screen.getByText("PRÉVIA — 48h de atraso")).toBeTruthy();
    expect(screen.getByText("Produto Prévia 1")).toBeTruthy();
    expect(screen.getByText("Produto Prévia 2")).toBeTruthy();
    expect(screen.getByText(/tempo real, sem atraso/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Todas" })).toBeNull();
  });
});
