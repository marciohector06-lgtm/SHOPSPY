import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { trendScoreFindManyMock, productFindManyMock } = vi.hoisted(() => ({
  trendScoreFindManyMock: vi.fn(),
  productFindManyMock: vi.fn(),
}));

vi.mock("@shopspy/database", () => ({
  prisma: {
    trendScore: { findMany: trendScoreFindManyMock },
    product: { findMany: productFindManyMock },
  },
}));

import { createApp } from "../src/app";
import { InMemoryJobLock } from "@shopspy/queue";
import type { Queue } from "bullmq";
import { signAccessToken } from "../src/lib/jwt";

function buildApp() {
  const queue = { add: vi.fn() } as unknown as Queue;
  return createApp({ internalRouterDeps: { queue, lock: new InMemoryJobLock() } });
}

describe("GET /api/v1/opportunities/top", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
  });

  beforeEach(() => {
    trendScoreFindManyMock.mockReset();
    productFindManyMock.mockReset();
  });

  it("FREE: pede no máximo 3 (take: 3) e devolve delayedAt preenchido", async () => {
    trendScoreFindManyMock.mockResolvedValue([{ productId: "p1" }, { productId: "p2" }, { productId: "p3" }]);
    productFindManyMock.mockResolvedValue([
      { id: "p1", scores: [], videos: [] },
      { id: "p2", scores: [], videos: [] },
      { id: "p3", scores: [], videos: [] },
    ]);

    const token = await signAccessToken({ sub: "u1", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null });
    const res = await request(buildApp()).get("/api/v1/opportunities/top").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(trendScoreFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
    expect(res.body.items).toHaveLength(3);
    expect(res.body.delayedAt).not.toBeNull();
  });

  it("PRO: pede um limite bem maior (take: 100) e delayedAt é null (tempo real)", async () => {
    trendScoreFindManyMock.mockResolvedValue([{ productId: "p1" }]);
    productFindManyMock.mockResolvedValue([{ id: "p1", scores: [], videos: [] }]);

    const token = await signAccessToken({ sub: "u2", email: "pro@shopspy.com", plan: "PRO", name: null, avatarUrl: null });
    const res = await request(buildApp()).get("/api/v1/opportunities/top").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(trendScoreFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(res.body.delayedAt).toBeNull();
  });

  it("sem autenticação: 401", async () => {
    const res = await request(buildApp()).get("/api/v1/opportunities/top");
    expect(res.status).toBe(401);
  });
});
