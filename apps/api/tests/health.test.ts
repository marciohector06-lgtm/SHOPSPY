import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { queryRawMock, scraperLogFindFirstMock, scraperLogFindManyMock, pingMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
  scraperLogFindFirstMock: vi.fn(),
  scraperLogFindManyMock: vi.fn(),
  pingMock: vi.fn(),
}));

vi.mock("@shopspy/database", () => ({
  prisma: {
    $queryRaw: queryRawMock,
    scraperLog: { findFirst: scraperLogFindFirstMock, findMany: scraperLogFindManyMock },
  },
}));

vi.mock("../src/lib/redis", () => ({
  getRedis: () => ({ ping: pingMock }),
}));

import { createApp } from "../src/app";
import { InMemoryJobLock } from "@shopspy/queue";
import type { Queue } from "bullmq";

function buildApp() {
  const queue = { add: vi.fn() } as unknown as Queue;
  return createApp({ internalRouterDeps: { queue, lock: new InMemoryJobLock() } });
}

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    queryRawMock.mockReset().mockResolvedValue([{ "?column?": 1 }]);
    scraperLogFindFirstMock.mockReset().mockResolvedValue(null);
    scraperLogFindManyMock.mockReset().mockResolvedValue([]);
    pingMock.mockReset().mockResolvedValue("PONG");
  });

  it("nunca tem cache — sempre responde Cache-Control: no-store", async () => {
    const res = await request(buildApp()).get("/api/v1/health");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("banco e redis no ar: status ok e componentes up", async () => {
    const res = await request(buildApp()).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.components).toEqual({ database: "up", redis: "up" });
  });

  it("banco fora do ar: status degraded e database down", async () => {
    queryRawMock.mockRejectedValue(new Error("connection refused"));

    const res = await request(buildApp()).get("/api/v1/health");

    expect(res.body.status).toBe("degraded");
    expect(res.body.components.database).toBe("down");
  });

  it("redis fora do ar: componente redis down", async () => {
    pingMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await request(buildApp()).get("/api/v1/health");

    expect(res.body.components.redis).toBe("down");
  });

  it("traz status por scraper com lastRun e nextRun", async () => {
    scraperLogFindFirstMock.mockResolvedValue({
      createdAt: new Date("2026-07-22T06:00:00.000Z"),
      status: "success",
      itemsFound: 42,
    });

    const res = await request(buildApp()).get("/api/v1/health");

    expect(Array.isArray(res.body.scrapers)).toBe(true);
    const shopee = res.body.scrapers.find((s: { source: string }) => s.source === "SHOPEE_BR");
    expect(shopee.lastRun).toEqual({ at: "2026-07-22T06:00:00.000Z", status: "success", itemsFound: 42 });
    expect(typeof shopee.nextRun).toBe("string");
  });

  it("nenhum scraper rodou hoje: lastCycle pending", async () => {
    const res = await request(buildApp()).get("/api/v1/health");
    expect(res.body.lastCycle.status).toBe("pending");
  });
});
