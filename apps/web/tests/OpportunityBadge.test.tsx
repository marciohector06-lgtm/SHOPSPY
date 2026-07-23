// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpportunityBadge } from "../src/components/OpportunityBadge";

describe("<OpportunityBadge />", () => {
  it("MAXIMUM: texto 'Máxima', cor spy-max, sem emoji", () => {
    render(<OpportunityBadge classification="MAXIMUM" />);
    const badge = screen.getByText("Máxima");
    expect(badge.className).toContain("text-spy-max");
  });

  it("HIGH: texto 'Alta', cor spy-high, sem emoji", () => {
    render(<OpportunityBadge classification="HIGH" />);
    const badge = screen.getByText("Alta");
    expect(badge.className).toContain("text-spy-high");
  });

  it("MEDIUM: texto 'Média', cor spy-medium, sem emoji", () => {
    render(<OpportunityBadge classification="MEDIUM" />);
    const badge = screen.getByText("Média");
    expect(badge.className).toContain("text-spy-medium");
  });

  it("SATURATING: texto 'Saturando', cor spy-sat, sem emoji", () => {
    render(<OpportunityBadge classification="SATURATING" />);
    const badge = screen.getByText("Saturando");
    expect(badge.className).toContain("text-spy-sat");
  });

  it("AVOID: texto 'Evitar', cor cinza (spy-muted), sem emoji", () => {
    render(<OpportunityBadge classification="AVOID" />);
    const badge = screen.getByText("Evitar");
    expect(badge.className).toContain("text-spy-muted");
  });
});
