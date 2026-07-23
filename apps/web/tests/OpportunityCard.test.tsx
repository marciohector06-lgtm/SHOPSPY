// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ProductDetail } from "../src/lib/types";
import { OpportunityCard } from "../src/components/OpportunityCard";

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
    commissionValueBR: 45,
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
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    scores: [
      {
        id: "s1",
        scoreTotal: 80,
        classification: "MAXIMUM",
        trendsUS: 90,
        trendsBR: 0,
        gap: 90,
        weeklyChangeUS: 0,
        weeklyChangeBR: 0,
        windowWeeks: 2,
        windowLabel: "2 semanas",
        weekNumber: 1,
        year: 2026,
        createdAt: new Date().toISOString(),
      },
    ],
    videos: [],
    ...overrides,
  };
}

describe("<OpportunityCard />", () => {
  it("mostra comissão em destaque, sem badge NOVO quando criado há mais de 48h", () => {
    render(<OpportunityCard product={fakeProduct()} onOpenScript={() => {}} />);
    expect(screen.getByText("R$ 45,00")).toBeTruthy();
    expect(screen.queryByText("NOVO")).toBeNull();
  });

  it("mostra badge NOVO quando createdAt está dentro das últimas 48h", () => {
    render(<OpportunityCard product={fakeProduct({ createdAt: new Date().toISOString() })} onOpenScript={() => {}} />);
    expect(screen.getByText("NOVO")).toBeTruthy();
  });

  it("GapIndicator mostra 'Dados BR em coleta...' quando trendsBR é 0", () => {
    render(<OpportunityCard product={fakeProduct()} onOpenScript={() => {}} />);
    expect(screen.getByText("Dados BR em coleta...")).toBeTruthy();
  });

  it("chama onOpenScript ao clicar em 'Roteiro UGC'", () => {
    const onOpenScript = vi.fn();
    render(<OpportunityCard product={fakeProduct()} onOpenScript={onOpenScript} />);
    fireEvent.click(screen.getByRole("button", { name: /Roteiro UGC/ }));
    expect(onOpenScript).toHaveBeenCalledTimes(1);
  });

  it("'Ver produto' aponta pra /produto/:id", () => {
    render(<OpportunityCard product={fakeProduct({ id: "abc123" })} onOpenScript={() => {}} />);
    expect(screen.getByRole("link", { name: "Ver produto" })).toHaveProperty("href", expect.stringContaining("/produto/abc123"));
  });
});
