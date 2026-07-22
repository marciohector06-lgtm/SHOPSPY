// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpportunityBadge } from "../src/components/OpportunityBadge";

describe("<OpportunityBadge />", () => {
  it("MAXIMUM: texto 'Máxima', emoji 🔥 e cor vermelha", () => {
    render(<OpportunityBadge classification="MAXIMUM" />);
    const badge = screen.getByText(/Máxima/);
    expect(badge.textContent).toContain("🔥");
    expect(badge.className).toContain("text-red-300");
  });

  it("HIGH: texto 'Alta', emoji ✅ e cor verde", () => {
    render(<OpportunityBadge classification="HIGH" />);
    const badge = screen.getByText(/Alta/);
    expect(badge.textContent).toContain("✅");
    expect(badge.className).toContain("text-emerald-300");
  });

  it("MEDIUM: texto 'Média', emoji 📈 e cor amarela", () => {
    render(<OpportunityBadge classification="MEDIUM" />);
    const badge = screen.getByText(/Média/);
    expect(badge.textContent).toContain("📈");
    expect(badge.className).toContain("text-yellow-300");
  });

  it("SATURATING: texto 'Saturando', emoji ⚠️ e cor laranja", () => {
    render(<OpportunityBadge classification="SATURATING" />);
    const badge = screen.getByText(/Saturando/);
    expect(badge.textContent).toContain("⚠️");
    expect(badge.className).toContain("text-orange-300");
  });

  it("AVOID: texto 'Evitar', emoji 🚫 e cor cinza", () => {
    render(<OpportunityBadge classification="AVOID" />);
    const badge = screen.getByText(/Evitar/);
    expect(badge.textContent).toContain("🚫");
    expect(badge.className).toContain("text-zinc-400");
  });
});
