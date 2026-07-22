// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBar } from "../src/components/ScoreBar";

describe("<ScoreBar />", () => {
  it("score >= 65: barra verde (emerald)", () => {
    render(<ScoreBar score={82} />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(screen.getByText("82")).toBeTruthy();
  });

  it("score entre 50 e 64: barra amarela", () => {
    render(<ScoreBar score={55} />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelector(".bg-yellow-500")).not.toBeNull();
  });

  it("score < 50: barra vermelha", () => {
    render(<ScoreBar score={30} />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelector(".bg-red-500")).not.toBeNull();
  });

  it("arredonda o valor exibido", () => {
    render(<ScoreBar score={71.8} />);
    expect(screen.getByText("72")).toBeTruthy();
  });
});
