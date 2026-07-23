// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GapIndicator } from "../src/components/GapIndicator";

describe("<GapIndicator />", () => {
  it("brScore null: mostra 'Dados BR em coleta...' em vez de barra zerada", () => {
    render(<GapIndicator globalScore={85} brScore={null} />);
    expect(screen.getByText("Dados BR em coleta...")).toBeTruthy();
    expect(screen.queryByText(/gap/)).toBeNull();
  });

  it("brScore 0: mesmo estado de coleta (hoje ainda não distinguimos '0 real' de 'nunca coletado')", () => {
    render(<GapIndicator globalScore={85} brScore={0} />);
    expect(screen.getByText("Dados BR em coleta...")).toBeTruthy();
  });

  it("brScore com valor real: mostra o comparativo normal com o gap calculado", () => {
    render(<GapIndicator globalScore={89} brScore={18} />);
    expect(screen.queryByText("Dados BR em coleta...")).toBeNull();
    expect(screen.getByText("+71 gap")).toBeTruthy();
  });
});
