// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AccessTokenPayload } from "../src/lib/jwt";
import type { ProductDetail } from "../src/lib/types";

const { fetchProductsMock, getCurrentUserMock, getAccessTokenCookieMock } = vi.hoisted(() => ({
  fetchProductsMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getAccessTokenCookieMock: vi.fn(),
}));

vi.mock("../src/lib/api", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/api")>("../src/lib/api");
  return { ...actual, fetchProducts: fetchProductsMock };
});

vi.mock("../src/lib/auth", () => ({
  getCurrentUser: getCurrentUserMock,
  getAccessTokenCookie: getAccessTokenCookieMock,
}));

import { ApiError } from "../src/lib/api";
import BuscaPage from "../src/app/busca/page";

const PRO_USER: AccessTokenPayload = { sub: "u1", email: "pro@shopspy.com", plan: "PRO", name: null, avatarUrl: null };

function fakeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    name: "Calça Jeans Wide Leg",
    nameEn: null,
    category: "FASHION_WOMEN",
    subcategory: null,
    imageUrl: null,
    status: "MONITORING",
    priceBR: null,
    commissionPctBR: null,
    commissionValueBR: 20,
    soldCountBR: null,
    ratingBR: null,
    searchesBR: null,
    creatorVideosBR: null,
    priceUS: null,
    soldCountUS: null,
    amazonRankUS: null,
    amazonRankUK: null,
    tiktokImpressions: null,
    tiktokCTR: null,
    latamScore: null,
    asiaScore: null,
    europeScore: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: [
      {
        id: "s1",
        scoreTotal: 70,
        classification: "HIGH",
        trendsUS: 80,
        trendsBR: 0,
        gap: 80,
        weeklyChangeUS: 0,
        weeklyChangeBR: 0,
        windowWeeks: 3,
        windowLabel: "2-3 semanas",
        weekNumber: 1,
        year: 2026,
        createdAt: new Date().toISOString(),
      },
    ],
    videos: [],
    ...overrides,
  };
}

describe("<BuscaPage />", () => {
  beforeEach(() => {
    fetchProductsMock.mockReset();
    getCurrentUserMock.mockReset().mockResolvedValue(PRO_USER);
    getAccessTokenCookieMock.mockReset().mockReturnValue("token123");
  });

  it("sem q na URL: pede pra digitar algo, não busca nada", async () => {
    render(await BuscaPage({ searchParams: {} }));
    expect(screen.getByText("Digite algo pra buscar")).toBeTruthy();
    expect(fetchProductsMock).not.toHaveBeenCalled();
  });

  it("com resultados: header 'Resultados para: X', contador, e um card por produto", async () => {
    fetchProductsMock.mockResolvedValue({ items: [fakeProduct({ name: "Calça Jeans Wide Leg" })], nextCursor: null });

    render(await BuscaPage({ searchParams: { q: "calça jeans wide leg" } }));

    expect(screen.getByText("Resultados para: calça jeans wide leg")).toBeTruthy();
    expect(screen.getByText("1 produto encontrado")).toBeTruthy();
    expect(screen.getByText("Calça Jeans Wide Leg")).toBeTruthy();
    expect(fetchProductsMock).toHaveBeenCalledWith({ q: "calça jeans wide leg" }, "token123");
  });

  it("plural correto pra mais de um resultado", async () => {
    fetchProductsMock.mockResolvedValue({
      items: [fakeProduct({ id: "p1" }), fakeProduct({ id: "p2" })],
      nextCursor: null,
    });
    render(await BuscaPage({ searchParams: { q: "soro" } }));
    expect(screen.getByText("2 produtos encontrados")).toBeTruthy();
  });

  it("sem resultado: EmptyState com o termo buscado, sugerindo termos mais simples", async () => {
    fetchProductsMock.mockResolvedValue({ items: [], nextCursor: null });

    render(await BuscaPage({ searchParams: { q: "produtoinexistentexyz" } }));

    expect(screen.getByText('Nenhum produto encontrado para "produtoinexistentexyz"')).toBeTruthy();
    expect(screen.getByText("Tente termos mais simples.")).toBeTruthy();
  });

  it("usuário FREE: UpgradeState, nunca chega a buscar", async () => {
    getCurrentUserMock.mockResolvedValue({ ...PRO_USER, plan: "FREE" });

    render(await BuscaPage({ searchParams: { q: "calça" } }));

    expect(screen.getByText(/exclusiva do plano PRO/)).toBeTruthy();
    expect(fetchProductsMock).not.toHaveBeenCalled();
  });

  it("erro genérico da API: ErrorState com a mensagem", async () => {
    fetchProductsMock.mockRejectedValue(new Error("banco indisponível"));
    render(await BuscaPage({ searchParams: { q: "calça" } }));
    expect(screen.getByText("banco indisponível")).toBeTruthy();
  });

  it("PRO_REQUIRED vindo da API (defensivo, mesmo já checando o plano antes): UpgradeState", async () => {
    fetchProductsMock.mockRejectedValue(new ApiError("Esse recurso é exclusivo do plano PRO.", 403, "PRO_REQUIRED", "/pricing"));
    render(await BuscaPage({ searchParams: { q: "calça" } }));
    expect(screen.getByText("Esse recurso é exclusivo do plano PRO.")).toBeTruthy();
  });
});
