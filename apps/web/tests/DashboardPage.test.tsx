// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../src/lib/api", () => ({
  fetchDashboardSummary: vi.fn().mockResolvedValue({
    weekNumber: 30,
    year: 2026,
    monitoredProducts: 42,
    newProductsLast48h: 7,
    alertsFiredToday: 3,
    bestScoreThisWeek: 91,
    topCategories: [
      { category: "BEAUTY_SKINCARE", averageScore: 72 },
      { category: "FITNESS", averageScore: 65 },
    ],
    topOpportunities: [
      {
        productId: "p1",
        name: "Sérum Facial Viral",
        category: "BEAUTY_SKINCARE",
        commissionValueBR: 12,
        scoreTotal: 91,
        classification: "MAXIMUM",
        windowLabel: "~3 semanas",
      },
    ],
  }),
  fetchHealth: vi.fn().mockResolvedValue({
    status: "ok",
    timestamp: "2026-07-22T12:00:00.000Z",
    components: { database: "up", redis: "up" },
    lastCycle: { cycleId: "2026-07-22", status: "pending", completedSources: 0, totalSources: 10 },
    scrapers: [],
  }),
  streamUrl: vi.fn().mockReturnValue("http://localhost:4000/api/v1/stream"),
}));

// jsdom não implementa ResizeObserver — o ResponsiveContainer do recharts precisa dele.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
);

class FakeEventSource {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_url: string) {}
  close(): void {}
}
vi.stubGlobal("EventSource", FakeEventSource);

import DashboardPage from "../src/app/dashboard/page";

describe("<DashboardPage />", () => {
  it("renderiza os 4 cards de métrica com os dados da API", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("42")).toBeTruthy(); // produtos monitorados
    expect(screen.getAllByText("91").length).toBeGreaterThan(0); // melhor score da semana (e/ou ScoreBar da top oportunidade)
    expect(screen.getByText("7")).toBeTruthy(); // novos produtos 48h
    expect(screen.getByText("3")).toBeTruthy(); // alertas hoje
  });

  it("lista a top oportunidade da semana com badge de classificação", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("Sérum Facial Viral")).toBeTruthy();
    expect(screen.getByText(/Máxima/)).toBeTruthy();
  });

  it("painel de status dos scrapers aparece no canto (conectando ao SSE)", async () => {
    render(<DashboardPage />);
    expect(await screen.findByText("Status dos Scrapers")).toBeTruthy();
  });
});
