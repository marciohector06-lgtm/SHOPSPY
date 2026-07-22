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
    retryStrategy: () => null,
    lazyConnect: true,
  });
  client.on("error", () => {
    // Redis fora do ar não deve derrubar as chamadas de IA — só perdem o cache.
  });

  return client;
}

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

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignora: cache é otimização, não fonte da verdade
  }
}
