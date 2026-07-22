import { describe, expect, it } from "vitest";
import { CycleBarrier, InMemoryBarrierStore } from "../src/barrier";

describe("CycleBarrier — barreira de dependência entre jobs", () => {
  const EXPECTED = ["ALIEXPRESS_GLOBAL", "AMAZON_US", "SHOPEE_BR"];

  it("não libera enquanto faltar pelo menos uma fonte", async () => {
    const barrier = new CycleBarrier(new InMemoryBarrierStore(), EXPECTED);
    const cycleId = "2026-07-22";

    expect(await barrier.markSourceDone(cycleId, "ALIEXPRESS_GLOBAL")).toBe(false);
    expect(await barrier.markSourceDone(cycleId, "AMAZON_US")).toBe(false);
    expect(await barrier.isComplete(cycleId)).toBe(false);
    expect(await barrier.getPending(cycleId)).toEqual(["SHOPEE_BR"]);
  });

  it("libera (retorna true) só quando a ÚLTIMA fonte pendente termina", async () => {
    const barrier = new CycleBarrier(new InMemoryBarrierStore(), EXPECTED);
    const cycleId = "2026-07-22";

    await barrier.markSourceDone(cycleId, "ALIEXPRESS_GLOBAL");
    await barrier.markSourceDone(cycleId, "AMAZON_US");
    const releasedOnLast = await barrier.markSourceDone(cycleId, "SHOPEE_BR");

    expect(releasedOnLast).toBe(true);
    expect(await barrier.isComplete(cycleId)).toBe(true);
  });

  it("um scraper que falha (mas esgotou as tentativas) ainda conta como concluído — não trava o ciclo", async () => {
    const barrier = new CycleBarrier(new InMemoryBarrierStore(), EXPECTED);
    const cycleId = "2026-07-22";

    // Simula: SHOPEE_BR falhou após 3 tentativas, mas o worker chama
    // markSourceDone mesmo assim (é isso que impede o ciclo de travar).
    await barrier.markSourceDone(cycleId, "ALIEXPRESS_GLOBAL");
    await barrier.markSourceDone(cycleId, "AMAZON_US");
    const released = await barrier.markSourceDone(cycleId, "SHOPEE_BR");

    expect(released).toBe(true);
  });

  it("ciclos diferentes não interferem entre si", async () => {
    const store = new InMemoryBarrierStore();
    const barrier = new CycleBarrier(store, EXPECTED);

    await barrier.markSourceDone("2026-07-22", "ALIEXPRESS_GLOBAL");
    expect(await barrier.getPending("2026-07-23")).toEqual(EXPECTED);
  });

  it("marcar a mesma fonte duas vezes não quebra nem conta duplicado", async () => {
    const barrier = new CycleBarrier(new InMemoryBarrierStore(), EXPECTED);
    const cycleId = "2026-07-22";

    await barrier.markSourceDone(cycleId, "ALIEXPRESS_GLOBAL");
    await barrier.markSourceDone(cycleId, "ALIEXPRESS_GLOBAL");
    expect(await barrier.getPending(cycleId)).toEqual(["AMAZON_US", "SHOPEE_BR"]);
  });
});
