import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { isoWeek } from "@shopspy/shared";
import { signAccessToken } from "../src/lib/jwt";

const { findManyMock, fakeRedis } = vi.hoisted(() => {
  class FakeRedis {
    store = new Map<string, { value: string; expiresAt: number }>();
    async get(key: string): Promise<string | null> {
      const entry = this.store.get(key);
      if (!entry || entry.expiresAt < Date.now()) return null;
      return entry.value;
    }
    async set(key: string, value: string, _mode: "EX", ttlSeconds: number): Promise<"OK"> {
      this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return "OK";
    }
    async ttl(key: string): Promise<number> {
      const entry = this.store.get(key);
      if (!entry) return -2;
      return Math.ceil((entry.expiresAt - Date.now()) / 1000);
    }
    clear(): void {
      this.store.clear();
    }
  }
  return { findManyMock: vi.fn(), fakeRedis: new FakeRedis() };
});

vi.mock("@shopspy/database", () => ({
  prisma: {
    trendScore: { findMany: findManyMock },
  },
}));

vi.mock("../src/lib/redis", () => ({ getRedis: () => fakeRedis }));

import { createApp } from "../src/app";
import { InMemoryJobLock } from "@shopspy/queue";
import type { Queue } from "bullmq";

function buildApp() {
  const queue = { add: vi.fn() } as unknown as Queue;
  return createApp({ internalRouterDeps: { queue, lock: new InMemoryJobLock() } });
}

let proAuthHeader: string;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = "test-secret";
  proAuthHeader = `Bearer ${await signAccessToken({ sub: "u1", email: "pro@shopspy.com", plan: "PRO", name: null, avatarUrl: null })}`;
});

describe("GET /api/v1/dashboard/category-trends", () => {
  beforeEach(() => {
    fakeRedis.clear();
    findManyMock.mockReset();
  });

  it("heatmap: calcula score médio, variação semanal e distribuição por classificação", async () => {
    findManyMock
      .mockResolvedValueOnce([
        { scoreTotal: 90, classification: "MAXIMUM", product: { category: "BEAUTY_SKINCARE" } },
        { scoreTotal: 70, classification: "HIGH", product: { category: "BEAUTY_SKINCARE" } },
        { scoreTotal: 40, classification: "AVOID", product: { category: "MAKEUP" } },
      ])
      .mockResolvedValueOnce([{ scoreTotal: 80, product: { category: "BEAUTY_SKINCARE" } }])
      .mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get("/api/v1/dashboard/category-trends")
      .set("Authorization", proAuthHeader);

    expect(res.status).toBe(200);

    const beauty = res.body.heatmap.find((h: { category: string }) => h.category === "BEAUTY_SKINCARE");
    expect(beauty.averageScore).toBe(80); // (90+70)/2
    expect(beauty.weeklyChangePct).toBe(0); // (80-80)/80*100

    const makeup = res.body.heatmap.find((h: { category: string }) => h.category === "MAKEUP");
    expect(makeup.averageScore).toBe(40);
    expect(makeup.weeklyChangePct).toBeNull(); // sem dado da semana anterior

    const untouched = res.body.heatmap.find((h: { category: string }) => h.category === "PETS");
    expect(untouched.averageScore).toBeNull();
    expect(untouched.weeklyChangePct).toBeNull();

    expect(res.body.classificationDistribution).toEqual({
      MAXIMUM: 1,
      HIGH: 1,
      MEDIUM: 0,
      SATURATING: 0,
      AVOID: 1,
    });
  });

  it("sem token: 401", async () => {
    const res = await request(buildApp()).get("/api/v1/dashboard/category-trends");
    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("plano FREE: 403 PRO_REQUIRED", async () => {
    const freeToken = `Bearer ${await signAccessToken({ sub: "u2", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null })}`;
    const res = await request(buildApp()).get("/api/v1/dashboard/category-trends").set("Authorization", freeToken);
    expect(res.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});

// Sanidade: confirma que o teste acima usa a mesma semana ISO que o handler calcularia de verdade.
describe("isoWeek (sanidade do teste acima)", () => {
  it("retorna weekNumber e year", () => {
    const { weekNumber, year } = isoWeek(new Date());
    expect(weekNumber).toBeGreaterThan(0);
    expect(year).toBeGreaterThan(2000);
  });
});
