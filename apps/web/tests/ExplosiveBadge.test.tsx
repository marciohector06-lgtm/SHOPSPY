// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExplosiveBadge } from "../src/components/ExplosiveBadge";

describe("<ExplosiveBadge />", () => {
  it("crescimento abaixo do limiar (200%): não renderiza nada", () => {
    const { container } = render(<ExplosiveBadge weeklyGrowth={150} />);
    expect(container.firstChild).toBeNull();
  });

  it("crescimento no limiar: renderiza com o percentual arredondado", () => {
    render(<ExplosiveBadge weeklyGrowth={200} />);
    expect(screen.getByText("+200% esta semana")).toBeTruthy();
  });

  it("crescimento acima do limiar: usa a cor spy-max (severidade alta)", () => {
    render(<ExplosiveBadge weeklyGrowth={347.8} />);
    const badge = screen.getByText("+348% esta semana");
    expect(badge.className).toContain("text-spy-max");
  });
});
