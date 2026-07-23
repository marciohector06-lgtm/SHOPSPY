// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBar } from "../src/components/ScoreBar";

describe("<ScoreBar /> — faixas de cor por valor", () => {
  it("0-49: cinza (spy-avoid)", () => {
    render(<ScoreBar score={30} />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelector(".bg-spy-avoid")).not.toBeNull();
  });

  it("50-64: âmbar (spy-medium)", () => {
    render(<ScoreBar score={55} />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelector(".bg-spy-medium")).not.toBeNull();
  });

  it("65-79: verde (spy-high)", () => {
    render(<ScoreBar score={72} />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelector(".bg-spy-high")).not.toBeNull();
  });

  it("80+: rosa (spy-max)", () => {
    render(<ScoreBar score={91} />);
    const meter = screen.getByRole("meter");
    expect(meter.querySelector(".bg-spy-max")).not.toBeNull();
  });

  it("arredonda o valor exibido", () => {
    render(<ScoreBar score={71.8} />);
    expect(screen.getByText("72")).toBeTruthy();
  });
});

describe("<ScoreBar /> — tamanhos", () => {
  it("sm: não mostra número", () => {
    render(<ScoreBar score={80} size="sm" />);
    expect(screen.queryByText("80")).toBeNull();
  });

  it("md (padrão): mostra número ao lado, sem label de tier", () => {
    render(<ScoreBar score={80} />);
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.queryByText("Excelente")).toBeNull();
  });

  it("lg: mostra número grande + label de tier embaixo", () => {
    render(<ScoreBar score={80} size="lg" />);
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("Excelente")).toBeTruthy();
  });

  it("lg com showLabel=false: esconde o label de tier", () => {
    render(<ScoreBar score={80} size="lg" showLabel={false} />);
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.queryByText("Excelente")).toBeNull();
  });
});
