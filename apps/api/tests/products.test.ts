import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { findManyMock, findUniqueMock, fakeRedis } = vi.hoisted(() => {
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

  return { findManyMock: vi.fn(), findUniqueMock: vi.fn(), fakeRedis: new FakeRedis() };
});

vi.mock("@shopspy/database", () => ({
  prisma: {
    product: { findMany: findManyMock, findUnique: findUniqueMock },
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

const PRODUCTS = [
  { id: "prod0001", name: "A", scores: [], videos: [] },
  { id: "prod0002", name: "B", scores: [], videos: [] },
  { id: "prod0003", name: "C", scores: [], videos: [] },
];

describe("GET /api/v1/products — paginação cursor-based", () => {
  beforeEach(() => {
    fakeRedis.clear();
    findManyMock.mockReset();
    findUniqueMock.mockReset();
  });

  it("primeira página traz `limit` itens e nextCursor apontando pro último id retornado", async () => {
    findManyMock.mockResolvedValue(PRODUCTS.slice(0, 3)); // limit=2 pede 3 (limit+1)

    const res = await request(buildApp()).get("/api/v1/products?limit=2");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.nextCursor).toBe("prod0002");
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3, orderBy: { id: "asc" } })
    );
  });

  it("segunda página usa o cursor e não repete/pula itens", async () => {
    findManyMock.mockResolvedValue([PRODUCTS[2]]);

    const res = await request(buildApp()).get("/api/v1/products?limit=2&cursor=prod0002");

    expect(res.body.items).toEqual([PRODUCTS[2]]);
    expect(res.body.nextCursor).toBeNull();
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "prod0002" }, skip: 1 })
    );
  });

  it("cache: primeira chamada é MISS, segunda chamada idêntica é HIT (mesmos headers)", async () => {
    findManyMock.mockResolvedValue(PRODUCTS.slice(0, 2));
    const app = buildApp();

    const first = await request(app).get("/api/v1/products?limit=5");
    expect(first.headers["x-cache"]).toBe("MISS");
    expect(first.headers["x-cache-ttl"]).toBe("30");

    const second = await request(app).get("/api/v1/products?limit=5");
    expect(second.headers["x-cache"]).toBe("HIT");
    expect(Number(second.headers["x-cache-ttl"])).toBeLessThanOrEqual(30);
    expect(second.body).toEqual(first.body);

    // Prisma só foi consultado uma vez — a segunda resposta veio do cache.
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it("SQL injection no cursor: payload é rejeitado com 400 antes de chegar ao Prisma", async () => {
    const res = await request(buildApp()).get(
      "/api/v1/products?cursor=" + encodeURIComponent("1' OR '1'='1'; DROP TABLE products;--")
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(res.body.details).toContainEqual(expect.objectContaining({ field: "cursor" }));
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("limit inválido (não numérico) responde 400 com o campo exato", async () => {
    const res = await request(buildApp()).get("/api/v1/products?limit=abc");

    expect(res.status).toBe(400);
    expect(res.body.details).toContainEqual(expect.objectContaining({ field: "limit" }));
  });
});

describe("GET /api/v1/products/:id", () => {
  beforeEach(() => {
    fakeRedis.clear();
    findUniqueMock.mockReset();
  });

  it("produto inexistente responde 404", async () => {
    findUniqueMock.mockResolvedValue(null);
    const res = await request(buildApp()).get("/api/v1/products/prod0001");
    expect(res.status).toBe(404);
  });

  it("id com caracteres inválidos (tentativa de injeção) responde 400, não 500", async () => {
    const res = await request(buildApp()).get(
      "/api/v1/products/" + encodeURIComponent("' OR 1=1--")
    );
    expect(res.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
