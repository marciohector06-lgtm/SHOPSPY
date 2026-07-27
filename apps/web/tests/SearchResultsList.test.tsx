// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ProductDetail } from "../src/lib/types";
import { SearchResultsList } from "../src/components/SearchResultsList";

function fakeProduct(id: string, name: string): ProductDetail {
  return {
    id,
    name,
    nameEn: null,
    category: "FASHION_WOMEN",
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
    latamScore: null,
    asiaScore: null,
    europeScore: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: [],
    videos: [],
  };
}

describe("<SearchResultsList />", () => {
  it("renderiza um OpportunityCard por produto", () => {
    render(<SearchResultsList items={[fakeProduct("p1", "Produto Um"), fakeProduct("p2", "Produto Dois")]} />);
    expect(screen.getByText("Produto Um")).toBeTruthy();
    expect(screen.getByText("Produto Dois")).toBeTruthy();
  });

  it("clicar em 'Roteiro UGC' de um card abre o modal com o produto certo", () => {
    render(<SearchResultsList items={[fakeProduct("p1", "Produto Um"), fakeProduct("p2", "Produto Dois")]} />);

    const buttons = screen.getAllByRole("button", { name: /Roteiro UGC/ });
    fireEvent.click(buttons[1]!); // segundo card

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/Roteiro UGC — Produto Dois/)).toBeTruthy();
  });
});
