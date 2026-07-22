import type Redis from "ioredis";
import type { BarrierStore } from "./barrier";

const CYCLE_TTL_SECONDS = 24 * 60 * 60;

/** Store da barreira em Redis (Set por ciclo) — usado em produção. */
export class RedisBarrierStore implements BarrierStore {
  constructor(private readonly redis: Redis) {}

  private key(cycleId: string): string {
    return `cycle-barrier:${cycleId}`;
  }

  async markDone(cycleId: string, source: string): Promise<void> {
    const key = this.key(cycleId);
    await this.redis.sadd(key, source);
    await this.redis.expire(key, CYCLE_TTL_SECONDS);
  }

  async getDoneSources(cycleId: string): Promise<string[]> {
    return this.redis.smembers(this.key(cycleId));
  }
}
