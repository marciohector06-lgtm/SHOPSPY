// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpportunityBadge } from "../src/components/OpportunityBadge";

describe("<OpportunityBadge />", () => {
  it("MAXIMUM: texto 'Máxima', emoji 🔥 e cor spy-max", () => {
    render(<OpportunityBadge classification="MAXIMUM" />);
    const badge = screen.getByText(/Máxima/);
    expect(badge.textContent).toContain("🔥");
    expect(badge.className).toContain("text-spy-max");
  });

  it("HIGH: texto 'Alta', emoji ✅ e cor spy-high", () => {
    render(<OpportunityBadge classification="HIGH" />);
    const badge = screen.getByText(/Alta/);
    expect(badge.textContent).toContain("✅");
    expect(badge.className).toContain("text-spy-high");
  });

  it("MEDIUM: texto 'Média', emoji 📈 e cor spy-medium", () => {
    render(<OpportunityBadge classification="MEDIUM" />);
    const badge = screen.getByText(/Média/);
    expect(badge.textContent).toContain("📈");
    expect(badge.className).toContain("text-spy-medium");
  });

  it("SATURATING: texto 'Saturando', emoji ⚠️ e cor spy-sat", () => {
    render(<OpportunityBadge classification="SATURATING" />);
    const badge = screen.getByText(/Saturando/);
    expect(badge.textContent).toContain("⚠️");
    expect(badge.className).toContain("text-spy-sat");
  });

  it("AVOID: texto 'Evitar', emoji 🚫 e cor cinza (spy-muted)", () => {
    render(<OpportunityBadge classification="AVOID" />);
    const badge = screen.getByText(/Evitar/);
    expect(badge.textContent).toContain("🚫");
    expect(badge.className).toContain("text-spy-muted");
  });
});
