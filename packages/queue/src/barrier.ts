export interface BarrierStore {
  markDone(cycleId: string, source: string): Promise<void>;
  getDoneSources(cycleId: string): Promise<string[]>;
}

/** Store em memória — usado nos testes, sem depender de Redis. */
export class InMemoryBarrierStore implements BarrierStore {
  private done = new Map<string, Set<string>>();

  async markDone(cycleId: string, source: string): Promise<void> {
    if (!this.done.has(cycleId)) this.done.set(cycleId, new Set());
    this.done.get(cycleId)!.add(source);
  }

  async getDoneSources(cycleId: string): Promise<string[]> {
    return [...(this.done.get(cycleId) ?? [])];
  }
}

/**
 * Barreira de dependência entre jobs: o score engine só deve rodar depois
 * que TODOS os scrapers do ciclo terminarem (com sucesso ou falha esgotada
 * — o que importa é que "acabaram de tentar"), não após cada um
 * individualmente. Um scraper que falha após esgotar as tentativas ainda
 * conta como "terminado" para não travar o ciclo inteiro.
 */
export class CycleBarrier {
  constructor(
    private readonly store: BarrierStore,
    private readonly expectedSources: readonly string[]
  ) {}

  /** Marca `source` como concluído no ciclo. Retorna true se essa marcação completou a barreira. */
  async markSourceDone(cycleId: string, source: string): Promise<boolean> {
    await this.store.markDone(cycleId, source);
    const pending = await this.getPending(cycleId);
    return pending.length === 0;
  }

  async getPending(cycleId: string): Promise<string[]> {
    const done = new Set(await this.store.getDoneSources(cycleId));
    return this.expectedSources.filter((source) => !done.has(source));
  }

  async isComplete(cycleId: string): Promise<boolean> {
    return (await this.getPending(cycleId)).length === 0;
  }
}
