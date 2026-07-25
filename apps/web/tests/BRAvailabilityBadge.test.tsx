// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BRAvailabilityBadge } from "../src/components/BRAvailabilityBadge";

describe("<BRAvailabilityBadge />", () => {
  it("priceBR e commissionValueBR presentes: mostra 'Disponível BR' com a comissão", () => {
    render(<BRAvailabilityBadge priceBR={49.9} commissionValueBR={12.5} />);
    expect(screen.getByText(/Disponível BR/)).toBeTruthy();
  });

  it("sem priceBR ainda: mostra o estado 'Verificando BR...'", () => {
    render(<BRAvailabilityBadge priceBR={null} commissionValueBR={null} />);
    expect(screen.getByText("Verificando BR...")).toBeTruthy();
  });

  it("priceBR sem commissionValueBR: ainda conta como não confirmado", () => {
    render(<BRAvailabilityBadge priceBR={49.9} commissionValueBR={null} />);
    expect(screen.getByText("Verificando BR...")).toBeTruthy();
  });
});
