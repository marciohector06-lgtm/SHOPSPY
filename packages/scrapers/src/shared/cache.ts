import Redis from "ioredis";

let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;

  if (!process.env.REDIS_URL) {
    client = null;
    return client;
  }

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // não fica tentando reconectar indefinidamente
    lazyConnect: true,
  });
  client.on("error", () => {
    // Redis fora do ar não deve derrubar o scraper — ele só perde o cache.
  });

  return client;
}

/** Lê do cache L2 (Redis). Retorna null em qualquer falha (Redis indisponível, chave ausente, etc). */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Grava no cache L2 com TTL em segundos. Falhas são silenciosas. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignora: cache é otimização, não fonte da verdade
  }
}
