// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TrendScoreEntry } from "../src/lib/types";
import { ScoreHistoryChart } from "../src/components/ScoreHistoryChart";

// jsdom não implementa ResizeObserver — recharts' ResponsiveContainer usa
// isso pra medir o container. Sem esse polyfill mínimo, o efeito quebra e
// derruba o componente antes mesmo de chegar no que o teste quer checar.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;

function fakeScore(overrides: Partial<TrendScoreEntry> = {}): TrendScoreEntry {
  return {
    id: "s1",
    scoreTotal: 70,
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

describe("<ScoreHistoryChart />", () => {
  it("sem nenhum score: estado vazio honesto", () => {
    render(<ScoreHistoryChart scores={[]} />);
    expect(screen.getByText("Sem histórico de score ainda")).toBeTruthy();
  });

  it("com 1 ponto só: mostra o aviso de histórico incompleto", () => {
    render(<ScoreHistoryChart scores={[fakeScore()]} />);
    expect(screen.getByText("Histórico completo disponível após a segunda semana de coleta")).toBeTruthy();
  });

  it("com 2+ pontos: não mostra o aviso de histórico incompleto", () => {
    render(<ScoreHistoryChart scores={[fakeScore({ id: "s1", weekNumber: 1 }), fakeScore({ id: "s2", weekNumber: 2 })]} />);
    expect(screen.queryByText("Histórico completo disponível após a segunda semana de coleta")).toBeNull();
  });
});
