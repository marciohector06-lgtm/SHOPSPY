// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProductDetail } from "../src/lib/types";

const { HOT_PRODUCT, COLD_PRODUCT } = vi.hoisted(() => {
  function buildProduct(overrides: Partial<ProductDetail>): ProductDetail {
    return {
      id: "p1",
      name: "Produto Base",
      nameEn: null,
      category: "BEAUTY_SKINCARE",
      subcategory: null,
      imageUrl: null,
      status: "OPPORTUNITY",
      priceBR: 49.9,
      commissionPctBR: 20,
      commissionValueBR: 10,
      soldCountBR: 120,
      ratingBR: 4.5,
      searchesBR: 500,
      creatorVideosBR: 10,
      priceUS: null,
      soldCountUS: null,
      amazonRankUS: null,
      amazonRankUK: null,
      tiktokImpressions: null,
      tiktokCTR: null,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      scores: [],
      videos: [],
      ...overrides,
    } as ProductDetail;
  }

  const HOT_PRODUCT = buildProduct({
    id: "p1",
    name: "Sérum Facial Viral",
    scores: [
      {
        id: "s1",
        scoreTotal: 88,
        classification: "MAXIMUM",
        trendsUS: 90,
        trendsBR: 40,
        gap: 50,
        weeklyChangeUS: 12,
        weeklyChangeBR: 3,
        windowWeeks: 3,
        windowLabel: "~3 semanas",
        weekNumber: 30,
        year: 2026,
        createdAt: "2026-07-20T00:00:00.000Z",
      },
    ],
  });

  const COLD_PRODUCT = buildProduct({ id: "p2", name: "Produto Sem Score", scores: [] });

  return { HOT_PRODUCT, COLD_PRODUCT };
});

vi.mock("../src/lib/api", () => ({
  fetchProducts: vi.fn().mockResolvedValue({ items: [HOT_PRODUCT, COLD_PRODUCT], nextCursor: null }),
}));

// jsdom não implementa ResizeObserver — o ResponsiveContainer do recharts (SparklineChart) precisa dele.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
);

import OpportunitiesPage from "../src/app/opportunities/page";

describe("<OpportunitiesPage />", () => {
  it("lista os produtos retornados pela API com score e classificação", async () => {
    render(<OpportunitiesPage />);

    expect(await screen.findByText("Sérum Facial Viral")).toBeTruthy();
    expect(screen.getByText("Produto Sem Score")).toBeTruthy();
    expect(screen.getByText("88")).toBeTruthy(); // ScoreBar do produto com score
    expect(screen.getByRole("row", { name: /Sérum Facial Viral/ }).textContent).toMatch(/Máxima/); // OpportunityBadge na linha
  });

  it("filtro de classificação esconde produtos que não batem", async () => {
    const user = userEvent.setup();
    render(<OpportunitiesPage />);

    await screen.findByText("Sérum Facial Viral");

    await user.selectOptions(screen.getByLabelText("Classificação"), "HIGH");

    await waitFor(() => {
      expect(screen.queryByText("Sérum Facial Viral")).toBeNull();
    });
    expect(screen.getByText(/Nenhum produto encontrado/)).toBeTruthy();
  });
});
