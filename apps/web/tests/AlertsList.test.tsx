// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Alert } from "../src/lib/types";

const { toggleAlertMock, deleteAlertMock } = vi.hoisted(() => ({
  toggleAlertMock: vi.fn(),
  deleteAlertMock: vi.fn(),
}));

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return { ...actual, toggleAlert: toggleAlertMock, deleteAlert: deleteAlertMock };
});

import { AlertsList } from "../src/components/AlertsList";

function fakeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "a1",
    threshold: 75,
    channel: "email",
    active: true,
    product: { id: "p1", name: "Produto Alertado", category: "ELECTRONICS_GADGETS", imageUrl: null, scores: [{ scoreTotal: 62 }] },
    ...overrides,
  };
}

describe("<AlertsList />", () => {
  beforeEach(() => {
    toggleAlertMock.mockReset();
    deleteAlertMock.mockReset();
  });

  it("mostra nome, score atual (ScoreBar sm, sem número — só a barra), threshold e canal do produto", () => {
    render(<AlertsList initialItems={[fakeAlert()]} />);
    expect(screen.getByText("Produto Alertado")).toBeTruthy();
    expect(screen.getByRole("meter")).toHaveProperty("ariaValueNow", "62");
    expect(screen.getByText("75")).toBeTruthy();
    expect(screen.getByText("E-mail")).toBeTruthy();
  });

  it("badge 'Ativo' clicável alterna pra 'Inativo' via toggleAlert", async () => {
    toggleAlertMock.mockResolvedValue({ id: "a1", active: false });
    render(<AlertsList initialItems={[fakeAlert({ active: true })]} />);

    fireEvent.click(screen.getByRole("button", { name: "Ativo" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Inativo" })).toBeTruthy());
    expect(toggleAlertMock).toHaveBeenCalledWith("a1");
  });

  it("'Remover' chama deleteAlert e tira o alerta da lista", async () => {
    deleteAlertMock.mockResolvedValue(undefined);
    render(<AlertsList initialItems={[fakeAlert({ id: "a1", product: { id: "p1", name: "Produto A", category: "OTHER", imageUrl: null, scores: [] } })]} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    await waitFor(() => expect(screen.queryByText("Produto A")).toBeNull());
    expect(deleteAlertMock).toHaveBeenCalledWith("a1");
  });

  it("sem score ainda calculado: mostra —, não quebra", () => {
    render(<AlertsList initialItems={[fakeAlert({ product: { id: "p1", name: "Produto Sem Score", category: "OTHER", imageUrl: null, scores: [] } })]} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});
