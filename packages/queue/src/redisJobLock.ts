import type Redis from "ioredis";
import type { JobLock } from "./jobLock";

/**
 * Lock distribuído via Redis (SET NX PX) — garante que, mesmo com múltiplos
 * processos/workers, só uma execução de cada `source` roda por vez. Se o
 * cron tenta disparar de novo enquanto o lock existe, `tryAcquire` retorna
 * false e quem chamou deve ignorar silenciosamente (não enfileirar de novo).
 */
export class RedisJobLock implements JobLock {
  constructor(private readonly redis: Redis) {}

  private key(source: string): string {
    return `job-lock:${source}`;
  }

  async tryAcquire(source: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis.set(this.key(source), "1", "PX", ttlMs, "NX");
    return result === "OK";
  }

  async release(source: string): Promise<void> {
    await this.redis.del(this.key(source));
  }
}
