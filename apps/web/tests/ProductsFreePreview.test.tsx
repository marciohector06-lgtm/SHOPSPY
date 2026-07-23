// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ProductDetail } from "../src/lib/types";
import { ProductsFreePreview } from "../src/components/ProductsFreePreview";

function fakeProduct(id: string, name: string): ProductDetail {
  return {
    id,
    name,
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
  };
}

describe("<ProductsFreePreview />", () => {
  it("mostra os produtos reais (desfocados) e o overlay de upgrade com link pra /pricing", () => {
    const items = [fakeProduct("p1", "Produto Real Um"), fakeProduct("p2", "Produto Real Dois")];
    render(<ProductsFreePreview items={items} />);

    expect(screen.getByText("Produto Real Um")).toBeTruthy();
    expect(screen.getByText("Produto Real Dois")).toBeTruthy();
    expect(screen.getByText(/exclusiva do plano PRO/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /assinar pro/i })).toHaveProperty("href", expect.stringContaining("/pricing"));
  });
});
