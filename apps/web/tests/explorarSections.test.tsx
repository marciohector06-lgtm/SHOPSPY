// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiError } from "../src/lib/api";
import type { DashboardSummary, HealthResponse, OpportunitiesTopResponse, ProductDetail } from "../src/lib/types";
import {
  BannerSection,
  CategoriesSection,
  CreatorsStubSection,
  New48hSection,
  ScraperStatusSection,
  TopProductsSection,
  VideosSection,
} from "../src/app/explorar/sections";

function fakeProduct(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    name: "Fone de Ouvido Bluetooth TWS",
    nameEn: null,
    category: "ELECTRONICS_GADGETS",
    subcategory: null,
    imageUrl: null,
    status: "MONITORING",
    priceBR: null,
    commissionPctBR: null,
    commissionValueBR: null,
    soldCountBR: null,
    ratingBR: null,
    searchesBR: null,
    creatorVideosBR: null,
    priceUS: null,
    soldCountUS: null,
    amazonRankUS: 1,
    amazonRankUK: null,
    tiktokImpressions: null,
    tiktokCTR: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scores: [
      {
        id: "s1",
        scoreTotal: 72,
        classification: "HIGH",
        trendsUS: 90,
        trendsBR: 0,
        gap: 90,
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

describe("<BannerSection />", () => {
  it("mostra o produto de maior score (items[0]) com nome e score reais", async () => {
    const data: OpportunitiesTopResponse = { items: [fakeProduct({ name: "Produto Top" })], delayedAt: null };
    render(await BannerSection({ dataPromise: Promise.resolve(data) }));
    expect(screen.getByText("Produto Top")).toBeTruthy();
    expect(screen.getByText("72")).toBeTruthy();
  });

  it("sem itens: EmptyState em vez de tela vazia", async () => {
    const data: OpportunitiesTopResponse = { items: [], delayedAt: null };
    render(await BannerSection({ dataPromise: Promise.resolve(data) }));
    expect(screen.getByText(/Ainda sem oportunidade calculada/)).toBeTruthy();
  });

  it("PRO_REQUIRED: mostra UpgradeState com link de upgrade, não um erro genérico", async () => {
    const rejected = Promise.reject(new ApiError("Esse recurso é exclusivo do plano PRO.", 403, "PRO_REQUIRED", "/pricing"));
    render(await BannerSection({ dataPromise: rejected }));
    expect(screen.getByText("Esse recurso é exclusivo do plano PRO.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /assinar pro/i })).toHaveProperty("href", expect.stringContaining("/pricing"));
  });

  it("erro genérico: ErrorState com a mensagem original", async () => {
    const rejected = Promise.reject(new Error("banco indisponível"));
    render(await BannerSection({ dataPromise: rejected }));
    expect(screen.getByText("banco indisponível")).toBeTruthy();
  });
});

describe("<TopProductsSection />", () => {
  it("mostra no máximo 10 linhas e o link 'ver todos' quando há mais", async () => {
    const items = Array.from({ length: 15 }, (_, i) => fakeProduct({ id: `p${i}`, name: `Produto ${i}` }));
    render(await TopProductsSection({ dataPromise: Promise.resolve({ items, delayedAt: null }) }));
    expect(screen.getAllByText("Ver")).toHaveLength(10);
    expect(screen.getByText("Ver todos os 15 produtos →")).toBeTruthy();
  });

  it("15 ou menos: sem o link 'ver todos'", async () => {
    const items = [fakeProduct()];
    render(await TopProductsSection({ dataPromise: Promise.resolve({ items, delayedAt: null }) }));
    expect(screen.queryByText(/Ver todos/)).toBeNull();
  });

  it("sem itens: EmptyState", async () => {
    render(await TopProductsSection({ dataPromise: Promise.resolve({ items: [], delayedAt: null }) }));
    expect(screen.getByText(/Nenhum produto pontuado ainda/)).toBeTruthy();
  });
});

describe("<New48hSection />", () => {
  it("sem produtos novos: EmptyState explicando o motivo, não erro", async () => {
    render(await New48hSection({ dataPromise: Promise.resolve({ items: [], delayedAt: null }) }));
    expect(screen.getByText(/Nenhum produto novo nas últimas 48h/)).toBeTruthy();
  });

  it("com produtos: renderiza um ProductCard por item, com GapIndicator em estado de coleta (trendsBR=0)", async () => {
    const data: OpportunitiesTopResponse = { items: [fakeProduct({ name: "Produto Novo" })], delayedAt: null };
    render(await New48hSection({ dataPromise: Promise.resolve(data) }));
    expect(screen.getByText("Produto Novo")).toBeTruthy();
    expect(screen.getByText("Dados BR em coleta...")).toBeTruthy();
  });
});

describe("<CreatorsStubSection />", () => {
  it("ocupa o espaço com estado honesto, nunca some", () => {
    render(<CreatorsStubSection />);
    expect(screen.getByText(/Dados de criadores chegam em breve/)).toBeTruthy();
  });
});

describe("<VideosSection />", () => {
  it("nenhum produto tem vídeos: EmptyState (caso real de ReferenceVideo vazio hoje)", async () => {
    const data: OpportunitiesTopResponse = { items: [fakeProduct({ videos: [] })], delayedAt: null };
    render(await VideosSection({ dataPromise: Promise.resolve(data) }));
    expect(screen.getByText(/Vídeos de referência serão exibidos após a próxima coleta/)).toBeTruthy();
  });

  it("com vídeos: agrega de todos os produtos e ordena por likes desc", async () => {
    const data: OpportunitiesTopResponse = {
      items: [
        fakeProduct({
          id: "p1",
          name: "Produto A",
          videos: [{ id: "v1", url: "https://tiktok.com/1", thumbnailUrl: null, platform: "tiktok", region: "US", likes: 10, views: 100, comments: 1, shares: 1, hook: null, hookType: null }],
        }),
        fakeProduct({
          id: "p2",
          name: "Produto B",
          videos: [{ id: "v2", url: "https://tiktok.com/2", thumbnailUrl: null, platform: "tiktok", region: "US", likes: 999, views: 100, comments: 1, shares: 1, hook: null, hookType: null }],
        }),
      ],
      delayedAt: null,
    };
    const { container } = render(await VideosSection({ dataPromise: Promise.resolve(data) }));
    const names = Array.from(container.querySelectorAll("[class*=line-clamp-1]")).map((el) => el.textContent);
    expect(names[0]).toBe("Produto B"); // 999 likes > 10 likes
  });
});

describe("<CategoriesSection />", () => {
  it("renderiza um chip por categoria com o score médio real", async () => {
    const data: DashboardSummary = {
      weekNumber: 1,
      year: 2026,
      monitoredProducts: 10,
      newProductsLast48h: 0,
      alertsFiredToday: 0,
      bestScoreThisWeek: 90,
      topCategories: [{ category: "BEAUTY_SKINCARE", averageScore: 77 }],
      topOpportunities: [],
    };
    render(await CategoriesSection({ dataPromise: Promise.resolve(data) }));
    expect(screen.getByText("77")).toBeTruthy();
    expect(screen.getByText("Beleza & Skincare")).toBeTruthy();
  });

  it("sem categorias pontuadas: EmptyState", async () => {
    const data: DashboardSummary = {
      weekNumber: 1,
      year: 2026,
      monitoredProducts: 0,
      newProductsLast48h: 0,
      alertsFiredToday: 0,
      bestScoreThisWeek: null,
      topCategories: [],
      topOpportunities: [],
    };
    render(await CategoriesSection({ dataPromise: Promise.resolve(data) }));
    expect(screen.getByText(/Sem categorias pontuadas ainda/)).toBeTruthy();
  });
});

describe("<ScraperStatusSection />", () => {
  it("renderiza um status por scraper, incluindo o SCORE_CALCULATOR com label amigável", async () => {
    const data: HealthResponse = {
      status: "ok",
      timestamp: new Date().toISOString(),
      components: { database: "up", redis: "up" },
      lastCycle: { cycleId: "2026-01-01", status: "completed", completedSources: 10, totalSources: 10 },
      scrapers: [
        { source: "SCORE_CALCULATOR", label: "Score Calculator", lastRun: { at: new Date().toISOString(), status: "success", itemsFound: 777 }, nextRun: null },
        { source: "GOOGLE_TRENDS_US", label: "Google Trends Global", lastRun: null, nextRun: null },
      ],
    };
    render(await ScraperStatusSection({ dataPromise: Promise.resolve(data) }));
    expect(screen.getByText("Score Calculator")).toBeTruthy();
    expect(screen.getByText("Google Trends Global")).toBeTruthy();
    expect(screen.getByText("Nunca rodou")).toBeTruthy();
  });
});
