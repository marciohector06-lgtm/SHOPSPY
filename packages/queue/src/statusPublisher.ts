import Redis from "ioredis";

export const STATUS_CHANNEL = "scraper-status";

export type ScraperState = "running" | "success" | "partial" | "error";

export interface ScraperStatusMessage {
  source: string;
  region: string;
  state: ScraperState;
  itemsFound?: number;
  itemsTotal?: number;
  message?: string;
  timestamp: string;
}

let publisher: Redis | null | undefined;

function getPublisher(): Redis | null {
  if (publisher !== undefined) return publisher;
  if (!process.env.REDIS_URL) {
    publisher = null;
    return publisher;
  }
  publisher = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
  });
  publisher.on("error", () => {
    // publicação de status é observabilidade, não deve derrubar o worker
  });
  return publisher;
}

/**
 * Publica o progresso de um scraper via Redis pub/sub, em tempo real — a
 * Fase 7 assina esse canal e repassa via SSE, sem precisar fazer polling
 * no ScraperLog do banco. Falha silenciosa se o Redis estiver fora do ar.
 */
export async function publishStatus(message: Omit<ScraperStatusMessage, "timestamp">): Promise<void> {
  const redis = getPublisher();
  if (!redis) return;

  const payload: ScraperStatusMessage = { ...message, timestamp: new Date().toISOString() };
  try {
    await redis.publish(STATUS_CHANNEL, JSON.stringify(payload));
  } catch {
    // ignora: observabilidade não pode derrubar o pipeline de scraping
  }
}
