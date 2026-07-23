// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankBadge } from "../src/components/RankBadge";

describe("<RankBadge />", () => {
  it("posição 1: gradiente dourado", () => {
    render(<RankBadge position={1} />);
    const el = screen.getByText("1");
    expect(el.style.background).toContain("linear-gradient");
    expect(el.style.background).toContain("255, 215, 0"); // #FFD700
  });

  it("posição 2: gradiente prateado", () => {
    render(<RankBadge position={2} />);
    const el = screen.getByText("2");
    expect(el.style.background).toContain("192, 192, 192"); // #C0C0C0
  });

  it("posição 3: gradiente bronze", () => {
    render(<RankBadge position={3} />);
    const el = screen.getByText("3");
    expect(el.style.background).toContain("205, 127, 50"); // #CD7F32
  });

  it("posição 4+: círculo simples sem gradiente, número em spy-muted", () => {
    render(<RankBadge position={10} />);
    const el = screen.getByText("10");
    expect(el.style.background).toBe("");
    expect(el.className).toContain("text-spy-muted");
  });
});
