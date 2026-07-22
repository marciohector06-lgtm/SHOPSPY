export interface JobLock {
  /** Tenta travar `source`. Retorna false se já está travado (job em andamento). */
  tryAcquire(source: string, ttlMs: number): Promise<boolean>;
  release(source: string): Promise<void>;
}

/**
 * Lock em memória — usado nos testes. Um `setTimeout` solta o lock sozinho
 * se `release` nunca for chamado (job travou/morreu), pelo TTL.
 */
export class InMemoryJobLock implements JobLock {
  private locked = new Map<string, ReturnType<typeof setTimeout>>();

  async tryAcquire(source: string, ttlMs: number): Promise<boolean> {
    if (this.locked.has(source)) return false;
    const timeout = setTimeout(() => this.locked.delete(source), ttlMs);
    timeout.unref?.();
    this.locked.set(source, timeout);
    return true;
  }

  async release(source: string): Promise<void> {
    const timeout = this.locked.get(source);
    if (timeout) clearTimeout(timeout);
    this.locked.delete(source);
  }
}
