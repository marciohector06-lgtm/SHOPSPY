import { describe, expect, it } from "vitest";
import { InMemoryJobLock } from "../src/jobLock";

describe("JobLock — proteção contra job duplicado", () => {
  it("segunda tentativa de travar a mesma fonte falha enquanto o job está rodando", async () => {
    const lock = new InMemoryJobLock();

    expect(await lock.tryAcquire("SHOPEE_BR", 60_000)).toBe(true);
    expect(await lock.tryAcquire("SHOPEE_BR", 60_000)).toBe(false); // cron tentou de novo, deve ser ignorado
  });

  it("fontes diferentes não competem pelo mesmo lock", async () => {
    const lock = new InMemoryJobLock();

    expect(await lock.tryAcquire("SHOPEE_BR", 60_000)).toBe(true);
    expect(await lock.tryAcquire("AMAZON_US", 60_000)).toBe(true);
  });

  it("depois de release, uma nova execução pode adquirir o lock", async () => {
    const lock = new InMemoryJobLock();

    await lock.tryAcquire("SHOPEE_BR", 60_000);
    await lock.release("SHOPEE_BR");
    expect(await lock.tryAcquire("SHOPEE_BR", 60_000)).toBe(true);
  });

  it("o lock expira sozinho pelo TTL se o job travar e nunca liberar", async () => {
    const lock = new InMemoryJobLock();

    await lock.tryAcquire("SHOPEE_BR", 30);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(await lock.tryAcquire("SHOPEE_BR", 60_000)).toBe(true);
  });
});
