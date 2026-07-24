// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CategoryTrendSeries } from "../src/lib/types";
import { CategoryTrendChart } from "../src/components/CategoryTrendChart";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;

function fakeSeries(): CategoryTrendSeries {
  return {
    category: "BEAUTY_SKINCARE",
    series: [
      { week: "2026-S01", avgTrendsBR: 20, avgTrendsUS: 60 },
      { week: "2026-S02", avgTrendsBR: 25, avgTrendsUS: 65 },
    ],
  };
}

describe("<CategoryTrendChart />", () => {
  it("mostra o nome da categoria formatado", () => {
    render(<CategoryTrendChart series={fakeSeries()} color="#6366F1" />);
    expect(screen.getByText("Beleza & Skincare")).toBeTruthy();
  });

  it("mostra a legenda Global (linha sólida) e Brasil (linha tracejada)", () => {
    render(<CategoryTrendChart series={fakeSeries()} color="#6366F1" />);
    expect(screen.getByText("Global")).toBeTruthy();
    expect(screen.getByText("Brasil")).toBeTruthy();
  });

  it("com 2+ semanas de dado real: não mostra o aviso de coleta insuficiente", () => {
    render(<CategoryTrendChart series={fakeSeries()} color="#6366F1" />);
    expect(screen.queryByText("Comparação completa disponível após mais semanas de coleta")).toBeNull();
  });

  it("com só 1 semana de dado real: mostra o aviso (Recharts não desenha linha/área com 1 ponto só)", () => {
    const series: CategoryTrendSeries = {
      category: "BEAUTY_SKINCARE",
      series: [
        { week: "2026-S01", avgTrendsBR: null, avgTrendsUS: null },
        { week: "2026-S02", avgTrendsBR: 0, avgTrendsUS: 47 },
      ],
    };
    render(<CategoryTrendChart series={series} color="#6366F1" />);
    expect(screen.getByText("Comparação completa disponível após mais semanas de coleta")).toBeTruthy();
  });
});
