// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { fetchAlertsMock, createAlertMock } = vi.hoisted(() => ({
  fetchAlertsMock: vi.fn(),
  createAlertMock: vi.fn(),
}));

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return { ...actual, fetchAlerts: fetchAlertsMock, createAlert: createAlertMock };
});

import { ApiError } from "../src/lib/api";
import { CreateAlertModal } from "../src/components/CreateAlertModal";

describe("<CreateAlertModal />", () => {
  beforeEach(() => {
    fetchAlertsMock.mockReset().mockResolvedValue({ items: [], usage: { used: 1, limit: 3 } });
    createAlertMock.mockReset();
  });

  it("fechado (isOpen=false) não renderiza nada e não busca uso", () => {
    const { container } = render(
      <CreateAlertModal productId="p1" productName="Produto X" isOpen={false} onClose={() => {}} />
    );
    expect(container.textContent).toBe("");
    expect(fetchAlertsMock).not.toHaveBeenCalled();
  });

  it("threshold padrão 75, com o texto explicativo", async () => {
    render(<CreateAlertModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);
    expect(screen.getByText("75")).toBeTruthy();
    expect(screen.getByText(/ultrapassar 75/)).toBeTruthy();
  });

  it("mover o slider atualiza o número e o texto explicativo", async () => {
    render(<CreateAlertModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Score mínimo pra disparar o alerta"), { target: { value: "40" } });
    expect(screen.getByText("40")).toBeTruthy();
    expect(screen.getByText(/ultrapassar 40/)).toBeTruthy();
  });

  it("FREE com alertas restantes: mostra 'X de Y alertas disponíveis' (restantes, não usados)", async () => {
    fetchAlertsMock.mockResolvedValue({ items: [], usage: { used: 1, limit: 3 } });
    render(<CreateAlertModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);
    expect(await screen.findByText("2 de 3 alertas disponíveis")).toBeTruthy();
  });

  it("limite atingido (used >= limit): mostra a mensagem de upgrade, sem o botão de criar", async () => {
    fetchAlertsMock.mockResolvedValue({ items: [], usage: { used: 3, limit: 3 } });
    render(<CreateAlertModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);
    expect(await screen.findByText("Limite de alertas atingido — faça upgrade para PRO.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Criar alerta" })).toBeNull();
  });

  it("PRO (limit null): não mostra contador nenhum", async () => {
    fetchAlertsMock.mockResolvedValue({ items: [], usage: { used: 10, limit: null } });
    render(<CreateAlertModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);
    await screen.findByRole("button", { name: "Criar alerta" });
    expect(screen.queryByText(/alertas disponíveis/)).toBeNull();
  });

  it("criar com sucesso: mostra confirmação", async () => {
    createAlertMock.mockResolvedValue({ id: "a1", threshold: 75, channel: "email", active: true });
    render(<CreateAlertModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);

    fireEvent.click(await screen.findByRole("button", { name: "Criar alerta" }));

    expect(await screen.findByText(/Alerta criado!/)).toBeTruthy();
    expect(createAlertMock).toHaveBeenCalledWith({ productId: "p1", threshold: 75, channel: "email" });
  });

  it("erro ao criar (ex.: limite atingido em corrida entre abas): mostra a mensagem do ApiError", async () => {
    createAlertMock.mockRejectedValue(new ApiError("Limite de alertas atingido — faça upgrade para PRO.", 403, "ALERT_LIMIT_REACHED", "/pricing"));
    render(<CreateAlertModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);

    fireEvent.click(await screen.findByRole("button", { name: "Criar alerta" }));

    expect(await screen.findByText("Limite de alertas atingido — faça upgrade para PRO.")).toBeTruthy();
  });
});
