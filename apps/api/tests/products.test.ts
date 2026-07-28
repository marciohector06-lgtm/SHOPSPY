import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { signAccessToken } from "../src/lib/jwt";

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

// /api/v1/products exige PRO (Fase 9) — todo teste aqui usa esse token.
let proAuthHeader: string;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = "test-secret";
  proAuthHeader = `Bearer ${await signAccessToken({ sub: "user1", email: "pro@shopspy.com", plan: "PRO", name: null, avatarUrl: null })}`;
});

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

    const res = await request(buildApp()).get("/api/v1/products?limit=2").set("Authorization", proAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.nextCursor).toBe("prod0002");
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3, orderBy: { id: "asc" } })
    );
  });

  it("segunda página usa o cursor e não repete/pula itens", async () => {
    findManyMock.mockResolvedValue([PRODUCTS[2]]);

    const res = await request(buildApp())
      .get("/api/v1/products?limit=2&cursor=prod0002")
      .set("Authorization", proAuthHeader);

    expect(res.body.items).toEqual([PRODUCTS[2]]);
    expect(res.body.nextCursor).toBeNull();
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "prod0002" }, skip: 1 })
    );
  });

  it("cache: primeira chamada é MISS, segunda chamada idêntica é HIT (mesmos headers)", async () => {
    findManyMock.mockResolvedValue(PRODUCTS.slice(0, 2));
    const app = buildApp();

    const first = await request(app).get("/api/v1/products?limit=5").set("Authorization", proAuthHeader);
    expect(first.headers["x-cache"]).toBe("MISS");
    expect(first.headers["x-cache-ttl"]).toBe("30");

    const second = await request(app).get("/api/v1/products?limit=5").set("Authorization", proAuthHeader);
    expect(second.headers["x-cache"]).toBe("HIT");
    expect(Number(second.headers["x-cache-ttl"])).toBeLessThanOrEqual(30);
    expect(second.body).toEqual(first.body);

    // Prisma só foi consultado uma vez — a segunda resposta veio do cache.
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it("SQL injection no cursor: payload é rejeitado com 400 antes de chegar ao Prisma", async () => {
    const res = await request(buildApp())
      .get("/api/v1/products?cursor=" + encodeURIComponent("1' OR '1'='1'; DROP TABLE products;--"))
      .set("Authorization", proAuthHeader);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(res.body.details).toContainEqual(expect.objectContaining({ field: "cursor" }));
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("limit inválido (não numérico) responde 400 com o campo exato", async () => {
    const res = await request(buildApp()).get("/api/v1/products?limit=abc").set("Authorization", proAuthHeader);

    expect(res.status).toBe(400);
    expect(res.body.details).toContainEqual(expect.objectContaining({ field: "limit" }));
  });

  it("sem token, responde 401 (não chega nem a validar query)", async () => {
    const res = await request(buildApp()).get("/api/v1/products?limit=2");
    expect(res.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("plano FREE responde 403 PRO_REQUIRED — /products é dado de oportunidade completo, só PRO", async () => {
    const freeToken = `Bearer ${await signAccessToken({ sub: "user2", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null })}`;
    const res = await request(buildApp()).get("/api/v1/products?limit=2").set("Authorization", freeToken);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "PRO_REQUIRED", upgradeUrl: "/pricing" });
    expect(findManyMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/products?q= — busca por nome", () => {
  beforeEach(() => {
    fakeRedis.clear();
    findManyMock.mockReset();
  });

  it("busca com ILIKE (contains, insensitive), sem cursor, no máximo 20", async () => {
    findManyMock.mockResolvedValue(PRODUCTS);

    const res = await request(buildApp())
      .get("/api/v1/products?q=" + encodeURIComponent("calça jeans"))
      .set("Authorization", proAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual(PRODUCTS);
    expect(res.body.nextCursor).toBeNull();
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { contains: "calça jeans", mode: "insensitive" } },
        take: 20,
      })
    );
    // Modo busca não usa cursor mesmo que um seja passado por engano.
    expect(findManyMock).not.toHaveBeenCalledWith(expect.objectContaining({ cursor: expect.anything() }));
  });

  it("sem resultado: items vazio, não erro", async () => {
    findManyMock.mockResolvedValue([]);

    const res = await request(buildApp())
      .get("/api/v1/products?q=produtoinexistentexyz")
      .set("Authorization", proAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("combina com category ao mesmo tempo, se os dois vierem", async () => {
    findManyMock.mockResolvedValue([]);

    await request(buildApp())
      .get("/api/v1/products?q=soro&category=BEAUTY_SKINCARE")
      .set("Authorization", proAuthHeader);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: "BEAUTY_SKINCARE", name: { contains: "soro", mode: "insensitive" } },
      })
    );
  });

  it("q vazio (só espaços) é rejeitado com 400, não vira busca vazia", async () => {
    const res = await request(buildApp()).get("/api/v1/products?q=" + encodeURIComponent("   ")).set("Authorization", proAuthHeader);

    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("plano FREE também recebe 403 PRO_REQUIRED na busca — mesma regra do endpoint inteiro", async () => {
    const freeToken = `Bearer ${await signAccessToken({ sub: "user3", email: "free2@shopspy.com", plan: "FREE", name: null, avatarUrl: null })}`;
    const res = await request(buildApp()).get("/api/v1/products?q=calça").set("Authorization", freeToken);

    expect(res.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/products?region= — aba de país/região de /produtos", () => {
  beforeEach(() => {
    fakeRedis.clear();
    findManyMock.mockReset();
  });

  it("region=BR filtra por presença de dado no Brasil (preço ou vendidos)", async () => {
    findManyMock.mockResolvedValue([]);

    await request(buildApp()).get("/api/v1/products?region=BR").set("Authorization", proAuthHeader);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ priceBR: { not: null } }, { soldCountBR: { not: null } }] },
      })
    );
  });

  it("region=GLOBAL filtra por presença de dado nos EUA/UK", async () => {
    findManyMock.mockResolvedValue([]);

    await request(buildApp()).get("/api/v1/products?region=GLOBAL").set("Authorization", proAuthHeader);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ priceUS: { not: null } }, { amazonRankUS: { not: null } }, { amazonRankUK: { not: null } }],
        },
      })
    );
  });

  it("region=LATAM filtra por latamScore acima do threshold, combinando com category", async () => {
    findManyMock.mockResolvedValue([]);

    await request(buildApp())
      .get("/api/v1/products?region=LATAM&category=FITNESS")
      .set("Authorization", proAuthHeader);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { category: "FITNESS", latamScore: { gt: 30 } },
      })
    );
  });

  it("sem region, não filtra por região (comportamento anterior preservado)", async () => {
    findManyMock.mockResolvedValue([]);

    await request(buildApp()).get("/api/v1/products").set("Authorization", proAuthHeader);

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("region inválida responde 400", async () => {
    const res = await request(buildApp())
      .get("/api/v1/products?region=ANTARCTICA")
      .set("Authorization", proAuthHeader);

    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/products/:id", () => {
  beforeEach(() => {
    fakeRedis.clear();
    findUniqueMock.mockReset();
  });

  it("produto inexistente responde 404", async () => {
    findUniqueMock.mockResolvedValue(null);
    const res = await request(buildApp()).get("/api/v1/products/prod0001").set("Authorization", proAuthHeader);
    expect(res.status).toBe(404);
  });

  it("id com caracteres inválidos (tentativa de injeção) responde 400, não 500", async () => {
    const res = await request(buildApp())
      .get("/api/v1/products/" + encodeURIComponent("' OR 1=1--"))
      .set("Authorization", proAuthHeader);
    expect(res.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
