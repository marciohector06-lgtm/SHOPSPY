import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Queue } from "bullmq";
import { InMemoryJobLock } from "@shopspy/queue";
import { createApp } from "../src/app";

const TOKEN = "test-internal-token";

function buildApp() {
  const add = vi.fn().mockResolvedValue({ id: "job-abc" });
  const queue = { add } as unknown as Queue;
  const lock = new InMemoryJobLock();
  const app = createApp({ internalRouterDeps: { queue, lock } });
  return { app, add, lock };
}

describe("POST /internal/jobs/:source/trigger — modo manual", () => {
  beforeEach(() => {
    process.env.INTERNAL_TOKEN = TOKEN;
  });

  it("sem o header de token, responde 401", async () => {
    const { app } = buildApp();
    const res = await request(app).post("/internal/jobs/SHOPEE_BR/trigger");
    expect(res.status).toBe(401);
  });

  it("com token errado, responde 401", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/internal/jobs/SHOPEE_BR/trigger")
      .set("x-internal-token", "token-errado");
    expect(res.status).toBe(401);
  });

  it("com token correto e fonte válida, dispara o job e responde 202", async () => {
    const { app, add } = buildApp();
    const res = await request(app)
      .post("/internal/jobs/SHOPEE_BR/trigger")
      .set("x-internal-token", TOKEN);

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ jobId: "job-abc", source: "SHOPEE_BR" });
    expect(add).toHaveBeenCalledTimes(1);
  });

  it("fonte desconhecida responde 404 e não chama a fila", async () => {
    const { app, add } = buildApp();
    const res = await request(app)
      .post("/internal/jobs/FONTE_INVENTADA/trigger")
      .set("x-internal-token", TOKEN);

    expect(res.status).toBe(404);
    expect(add).not.toHaveBeenCalled();
  });

  it("fonte já rodando (lock ativo) responde 409 e não enfileira de novo", async () => {
    const { app, add, lock } = buildApp();
    await lock.tryAcquire("SHOPEE_BR", 60_000); // simula job já em andamento

    const res = await request(app)
      .post("/internal/jobs/SHOPEE_BR/trigger")
      .set("x-internal-token", TOKEN);

    expect(res.status).toBe(409);
    expect(add).not.toHaveBeenCalled();
  });
});
