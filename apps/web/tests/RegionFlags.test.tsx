// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegionFlags } from "../src/components/RegionFlags";

describe("<RegionFlags />", () => {
  it("mostra só as regiões com score acima do mínimo", () => {
    render(<RegionFlags latamScore={71} asiaScore={20} europeScore={null} />);
    expect(screen.getByText("LATAM 71")).toBeTruthy();
    expect(screen.queryByText(/Ásia/)).toBeNull();
    expect(screen.queryByText(/Europa/)).toBeNull();
  });

  it("não renderiza nada quando nenhuma região passa do mínimo", () => {
    const { container } = render(<RegionFlags latamScore={10} asiaScore={null} europeScore={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("mostra as 3 regiões quando todas passam do mínimo, arredondando o score", () => {
    render(<RegionFlags latamScore={71.6} asiaScore={45.2} europeScore={33.9} />);
    expect(screen.getByText("LATAM 72")).toBeTruthy();
    expect(screen.getByText("Ásia 45")).toBeTruthy();
    expect(screen.getByText("Europa 34")).toBeTruthy();
  });
});
