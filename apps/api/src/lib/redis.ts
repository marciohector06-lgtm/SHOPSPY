import Redis from "ioredis";

let client: Redis | undefined;

/** Singleton lazy — reusado pelo cache e pelo health check (comandos normais, não subscriber). */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    client.on("error", () => {
      // indisponibilidade é tratada em cada chamador (cache vira MISS, health vira "down")
    });
  }
  return client;
}
