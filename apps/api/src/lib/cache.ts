import type { Response } from "express";
import { getRedis } from "./redis";

const KEY_PREFIX = "api:cache:";

/**
 * Cache HTTP com transparência via header: toda resposta cacheável sai com
 * X-Cache (HIT/MISS) e X-Cache-TTL (segundos restantes), pedido explicitamente
 * para facilitar debug em produção. Redis indisponível degrada para MISS
 * silencioso (cache é otimização, não fonte da verdade).
 */
export async function withCache<T>(
  res: Response,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const redis = getRedis();
  const cacheKey = `${KEY_PREFIX}${key}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      const ttl = await redis.ttl(cacheKey);
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-TTL", String(Math.max(ttl, 0)));
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis fora do ar: segue para o loader como se fosse MISS
  }

  const value = await loader();

  try {
    await redis.set(cacheKey, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignora: sem cache não impede a resposta
  }

  res.setHeader("X-Cache", "MISS");
  res.setHeader("X-Cache-TTL", String(ttlSeconds));
  return value;
}
