// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ProductDetail, TrendScoreEntry } from "../src/lib/types";
import { ProductActionCard } from "../src/components/ProductActionCard";

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return {
    ...actual,
    streamScript: vi.fn(async () => {}),
    fetchAlerts: vi.fn().mockResolvedValue({ items: [], usage: { used: 0, limit: 3 } }),
  };
});

function fakeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    name: "Produto Teste",
    nameEn: null,
    category: "ELECTRONICS_GADGETS",
    subcategory: null,
    imageUrl: null,
    status: "MONITORING",
    priceBR: null,
    commissionPctBR: null,
    commissionValueBR: 32.5,
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
    latamScore: null,
    asiaScore: null,
    europeScore: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: [],
    videos: [],
    ...overrides,
  };
}

function fakeScore(overrides: Partial<TrendScoreEntry> = {}): TrendScoreEntry {
  return {
    id: "s1",
    scoreTotal: 72,
    classification: "HIGH",
    trendsUS: 80,
    trendsBR: 0,
    gap: 80,
    weeklyChangeUS: 0,
    weeklyChangeBR: 0,
    windowWeeks: 2,
    windowLabel: "2-3 semanas",
    weekNumber: 1,
    year: 2026,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("<ProductActionCard />", () => {
  it("mostra a comissão formatada", () => {
    render(<ProductActionCard product={fakeProduct()} score={fakeScore()} />);
    expect(screen.getByText("R$ 32,50")).toBeTruthy();
  });

  it("sem score calculado: mostra aviso em vez de quebrar", () => {
    render(<ProductActionCard product={fakeProduct()} score={null} />);
    expect(screen.getByText("Ainda sem score calculado pra esse produto.")).toBeTruthy();
  });

  it("clicar em 'Gerar Roteiro UGC' abre o UGCScriptModal", () => {
    render(<ProductActionCard product={fakeProduct()} score={fakeScore()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Gerar Roteiro UGC/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("clicar em 'Criar alerta' abre o CreateAlertModal", async () => {
    render(<ProductActionCard product={fakeProduct({ name: "Produto Alertável" })} score={fakeScore()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Criar alerta" }));
    expect(await screen.findByText("Criar alerta — Produto Alertável")).toBeTruthy();
  });
});
