// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { AccessTokenPayload } from "../src/lib/jwt";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/explorar",
  useRouter: () => ({ push: pushMock }),
}));

import { Topbar } from "../src/components/Topbar";
import { PeriodProvider } from "../src/lib/PeriodContext";

const USER: AccessTokenPayload = { sub: "u1", email: "user@shopspy.com", plan: "PRO", name: "Usuário Teste", avatarUrl: null };

function renderTopbar() {
  return render(
    <PeriodProvider>
      <Topbar user={USER} />
    </PeriodProvider>
  );
}

describe("<Topbar /> — busca global", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("ícone de lupa expande o input de busca ao clicar", () => {
    renderTopbar();
    const input = screen.getByPlaceholderText("Buscar produto...");
    expect(input.className).toContain("w-0");

    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));
    expect(input.className).not.toContain("w-0");
  });

  it("Enter no input navega pra /busca?q=<termo>", () => {
    renderTopbar();
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));

    const input = screen.getByPlaceholderText("Buscar produto...");
    fireEvent.change(input, { target: { value: "calça jeans wide leg" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(pushMock).toHaveBeenCalledWith("/busca?q=cal%C3%A7a%20jeans%20wide%20leg");
  });

  it("clicar no ícone de lupa (já aberto, com texto) também submete a busca", () => {
    renderTopbar();
    const searchButton = screen.getByRole("button", { name: "Buscar produto" });
    fireEvent.click(searchButton); // abre

    const input = screen.getByPlaceholderText("Buscar produto...");
    fireEvent.change(input, { target: { value: "soro facial" } });
    fireEvent.click(searchButton); // clica de novo pra submeter

    expect(pushMock).toHaveBeenCalledWith("/busca?q=soro%20facial");
  });

  it("input vazio: Enter não navega", () => {
    renderTopbar();
    fireEvent.click(screen.getByRole("button", { name: "Buscar produto" }));
    const input = screen.getByPlaceholderText("Buscar produto...");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("<Topbar /> — menu do avatar", () => {
  it("clicar no avatar mostra o link 'Meus alertas' apontando pra /alertas", () => {
    renderTopbar();
    expect(screen.queryByText("Meus alertas")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu da conta" }));

    const link = screen.getByRole("link", { name: /Meus alertas/ });
    expect(link).toHaveProperty("href", expect.stringContaining("/alertas"));
  });

  it("clicar no backdrop fecha o menu", () => {
    renderTopbar();
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu da conta" }));
    expect(screen.getByText("Meus alertas")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Fechar menu da conta" }));
    expect(screen.queryByText("Meus alertas")).toBeNull();
  });
});
