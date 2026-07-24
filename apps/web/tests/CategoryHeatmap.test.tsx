// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CategoryHeatmapEntry } from "../src/lib/types";
import { CategoryHeatmap } from "../src/components/CategoryHeatmap";

function entry(overrides: Partial<CategoryHeatmapEntry> = {}): CategoryHeatmapEntry {
  return { category: "BEAUTY_SKINCARE", averageScore: null, weeklyChangePct: null, ...overrides };
}

describe("<CategoryHeatmap />", () => {
  it("score >= 80: célula verde escuro", () => {
    render(<CategoryHeatmap entries={[entry({ averageScore: 85 })]} />);
    const cell = screen.getByText("85").closest("div")!;
    expect(cell.className).toContain("bg-[#065F46]");
  });

  it("score 65-80: célula verde (spy-high)", () => {
    render(<CategoryHeatmap entries={[entry({ averageScore: 70 })]} />);
    const cell = screen.getByText("70").closest("div")!;
    expect(cell.className).toContain("bg-spy-high");
  });

  it("score 50-65: célula âmbar (spy-medium)", () => {
    render(<CategoryHeatmap entries={[entry({ averageScore: 55 })]} />);
    const cell = screen.getByText("55").closest("div")!;
    expect(cell.className).toContain("bg-spy-medium");
  });

  it("score < 50: célula cinza (spy-avoid)", () => {
    render(<CategoryHeatmap entries={[entry({ averageScore: 30 })]} />);
    const cell = screen.getByText("30").closest("div")!;
    expect(cell.className).toContain("bg-spy-avoid");
  });

  it("sem dado (averageScore null): mostra traço, sem cor de calor", () => {
    render(<CategoryHeatmap entries={[entry()]} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("tooltip (title) mostra score exato e variação semanal", () => {
    render(<CategoryHeatmap entries={[entry({ averageScore: 82, weeklyChangePct: 12.4 })]} />);
    const cell = screen.getByText("82").closest("div")!;
    expect(cell.getAttribute("title")).toContain("82");
    expect(cell.getAttribute("title")).toContain("+12.4%");
  });

  it("tooltip sem semana anterior: indica 'sem variação anterior'", () => {
    render(<CategoryHeatmap entries={[entry({ averageScore: 82, weeklyChangePct: null })]} />);
    const cell = screen.getByText("82").closest("div")!;
    expect(cell.getAttribute("title")).toContain("sem variação anterior");
  });
});
