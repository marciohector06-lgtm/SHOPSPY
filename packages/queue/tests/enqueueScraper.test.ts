import { describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import { enqueueScraper } from "../src/jobs";
import { InMemoryJobLock } from "../src/jobLock";

function fakeQueue() {
  const add = vi.fn().mockResolvedValue({ id: "job-123" });
  return { queue: { add } as unknown as Queue, add };
}

describe("enqueueScraper — proteção contra job duplicado na fila", () => {
  it("enfileira normalmente quando a fonte não está travada", async () => {
    const { queue, add } = fakeQueue();
    const lock = new InMemoryJobLock();

    const jobId = await enqueueScraper(queue, lock, "SHOPEE_BR");

    expect(jobId).toBe("job-123");
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]![0]).toBe("SHOPEE_BR");
  });

  it("NÃO enfileira (retorna null) quando a fonte já está rodando", async () => {
    const { queue, add } = fakeQueue();
    const lock = new InMemoryJobLock();
    await lock.tryAcquire("SHOPEE_BR", 60_000); // simula job já em andamento

    const jobId = await enqueueScraper(queue, lock, "SHOPEE_BR");

    expect(jobId).toBeNull();
    expect(add).not.toHaveBeenCalled();
  });

  it("lança erro para fonte desconhecida (não registrada no registry)", async () => {
    const { queue } = fakeQueue();
    const lock = new InMemoryJobLock();

    await expect(enqueueScraper(queue, lock, "FONTE_INVENTADA")).rejects.toThrow();
  });

  it("fontes diferentes não bloqueiam uma à outra", async () => {
    const { queue, add } = fakeQueue();
    const lock = new InMemoryJobLock();
    await lock.tryAcquire("SHOPEE_BR", 60_000);

    const jobId = await enqueueScraper(queue, lock, "AMAZON_US");

    expect(jobId).toBe("job-123");
    expect(add).toHaveBeenCalledTimes(1);
  });
});
