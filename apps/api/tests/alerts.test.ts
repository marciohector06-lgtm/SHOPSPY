import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const { userFindUniqueMock, productFindUniqueMock, alertCreateMock, transactionMock } = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
  alertCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@shopspy/database", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock },
    product: { findUnique: productFindUniqueMock },
    alert: { create: alertCreateMock },
    $transaction: transactionMock,
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

const ALERT_BODY = { productId: "prod0001", threshold: 80, channel: "email" };

describe("POST /api/v1/alerts", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
  });

  beforeEach(() => {
    userFindUniqueMock.mockReset();
    productFindUniqueMock.mockReset().mockResolvedValue({ id: "prod0001" });
    alertCreateMock.mockReset();
    transactionMock.mockReset().mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn({ alert: { create: alertCreateMock }, user: { update: vi.fn() } });
      }
      return Promise.all(fn as Promise<unknown>[]);
    });
  });

  it("FREE dentro do limite: cria o alerta normalmente (201)", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u1", alertsUsed: 2, alertsLimit: 3 });
    alertCreateMock.mockResolvedValue({ id: "alert1", ...ALERT_BODY });

    const token = await signAccessToken({ sub: "u1", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null });
    const res = await request(buildApp()).post("/api/v1/alerts").set("Authorization", `Bearer ${token}`).send(ALERT_BODY);

    expect(res.status).toBe(201);
    expect(alertCreateMock).toHaveBeenCalledTimes(1);
  });

  it("FREE no limite (alertsUsed >= alertsLimit): 403 ALERT_LIMIT_REACHED, não cria", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u1", alertsUsed: 3, alertsLimit: 3 });

    const token = await signAccessToken({ sub: "u1", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null });
    const res = await request(buildApp()).post("/api/v1/alerts").set("Authorization", `Bearer ${token}`).send(ALERT_BODY);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "ALERT_LIMIT_REACHED", limit: 3, upgradeUrl: "/pricing" });
    expect(alertCreateMock).not.toHaveBeenCalled();
  });

  it("PRO ignora alertsUsed/alertsLimit — cria mesmo already no limite salvo no banco", async () => {
    alertCreateMock.mockResolvedValue({ id: "alert2", ...ALERT_BODY });

    const token = await signAccessToken({ sub: "u2", email: "pro@shopspy.com", plan: "PRO", name: null, avatarUrl: null });
    const res = await request(buildApp()).post("/api/v1/alerts").set("Authorization", `Bearer ${token}`).send(ALERT_BODY);

    expect(res.status).toBe(201);
    expect(userFindUniqueMock).not.toHaveBeenCalled(); // nem precisa checar limite pro PRO
  });

  it("produto inexistente: 404, não cria alerta", async () => {
    productFindUniqueMock.mockResolvedValue(null);

    const token = await signAccessToken({ sub: "u1", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null });
    const res = await request(buildApp()).post("/api/v1/alerts").set("Authorization", `Bearer ${token}`).send(ALERT_BODY);

    expect(res.status).toBe(404);
    expect(alertCreateMock).not.toHaveBeenCalled();
  });

  it("body inválido (threshold fora de 0-100): 400", async () => {
    const token = await signAccessToken({ sub: "u1", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null });
    const res = await request(buildApp())
      .post("/api/v1/alerts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...ALERT_BODY, threshold: 150 });

    expect(res.status).toBe(400);
    expect(alertCreateMock).not.toHaveBeenCalled();
  });

  it("sem autenticação: 401", async () => {
    const res = await request(buildApp()).post("/api/v1/alerts").send(ALERT_BODY);
    expect(res.status).toBe(401);
  });
});
