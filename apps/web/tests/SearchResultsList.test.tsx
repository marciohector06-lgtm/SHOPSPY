// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ProductDetail } from "../src/lib/types";

const { fetchAlertsMock } = vi.hoisted(() => ({ fetchAlertsMock: vi.fn() }));
vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return { ...actual, fetchAlerts: fetchAlertsMock };
});

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
  beforeEach(() => {
    fetchAlertsMock.mockReset().mockResolvedValue({ items: [], usage: { used: 0, limit: null } });
  });

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

  it("clicar em 'Criar alerta' de um card abre o CreateAlertModal com o produto certo", async () => {
    render(<SearchResultsList items={[fakeProduct("p1", "Produto Um"), fakeProduct("p2", "Produto Dois")]} />);

    const buttons = screen.getAllByRole("button", { name: /Criar alerta/ });
    fireEvent.click(buttons[0]!); // primeiro card

    expect(await screen.findByText("Criar alerta — Produto Um")).toBeTruthy();
  });
});
