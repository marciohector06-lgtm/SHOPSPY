// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ProductDetail } from "../src/lib/types";
import { ProductComparison } from "../src/components/ProductComparison";

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
    commissionValueBR: null,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: [],
    videos: [],
    ...overrides,
  };
}

describe("<ProductComparison />", () => {
  it("campo null não aparece — nem linha, nem traço", () => {
    render(<ProductComparison product={fakeProduct({ priceBR: 49.9, ratingBR: null, soldCountBR: null })} />);
    expect(screen.getByText("Preço")).toBeTruthy();
    expect(screen.queryByText("Avaliação")).toBeNull();
    expect(screen.queryByText("Vendidos")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("bloco Brasil sem nenhum dado real: mostra estado vazio honesto, não uma tabela em branco", () => {
    render(<ProductComparison product={fakeProduct()} />);
    expect(screen.getByText("Dados Brasil ainda não coletados")).toBeTruthy();
  });

  it("bloco Global com rank da Amazon: mostra a linha formatada", () => {
    render(<ProductComparison product={fakeProduct({ amazonRankUS: 12 })} />);
    expect(screen.getByText("Rank Amazon US")).toBeTruthy();
    expect(screen.getByText("#12")).toBeTruthy();
  });
});
