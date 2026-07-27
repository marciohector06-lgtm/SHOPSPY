// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Alert } from "../src/lib/types";

const { fetchAlertsMock, getAccessTokenCookieMock } = vi.hoisted(() => ({
  fetchAlertsMock: vi.fn(),
  getAccessTokenCookieMock: vi.fn(),
}));

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return { ...actual, fetchAlerts: fetchAlertsMock };
});

vi.mock("../src/lib/auth", () => ({ getAccessTokenCookie: getAccessTokenCookieMock }));

import AlertasPage from "../src/app/alertas/page";

function fakeAlert(): Alert {
  return {
    id: "a1",
    threshold: 75,
    channel: "email",
    active: true,
    product: { id: "p1", name: "Produto Alertado", category: "OTHER", imageUrl: null, scores: [] },
  };
}

describe("<AlertasPage />", () => {
  beforeEach(() => {
    fetchAlertsMock.mockReset();
    getAccessTokenCookieMock.mockReset().mockReturnValue("token123");
  });

  it("sem alertas: EmptyState pedindo pra ir até um produto e clicar em Criar alerta", async () => {
    fetchAlertsMock.mockResolvedValue({ items: [], usage: { used: 0, limit: 3 } });
    render(await AlertasPage());
    expect(screen.getByText("Você não tem alertas configurados")).toBeTruthy();
    expect(screen.getByText("Vá até um produto e clique em Criar alerta.")).toBeTruthy();
  });

  it("com alertas: renderiza a lista", async () => {
    fetchAlertsMock.mockResolvedValue({ items: [fakeAlert()], usage: { used: 1, limit: 3 } });
    render(await AlertasPage());
    expect(screen.getByText("Produto Alertado")).toBeTruthy();
  });
});
