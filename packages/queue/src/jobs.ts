import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";
import type Redis from "ioredis";
import { SCRAPER_RUNNERS, isKnownSource } from "./registry";
import { CycleBarrier } from "./barrier";
import { RedisBarrierStore } from "./redisBarrierStore";
import type { JobLock } from "./jobLock";
import { RedisJobLock } from "./redisJobLock";
import { publishStatus } from "./statusPublisher";
import { computeBackoffDelay, MAX_ATTEMPTS, JOB_TIMEOUT_MS, MAX_CONCURRENT_SCRAPERS } from "./retryBackoff";
import { CYCLE_SCRAPER_SOURCES } from "./schedules";

export const QUEUE_NAME = "shopspy-scrapers";
const LOCK_TTL_MS = JOB_TIMEOUT_MS + 60_000; // margem sobre o timeout do job

function todayCycleId(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function regionFor(source: string): string {
  if (source.endsWith("_BR")) return "BR";
  if (source.endsWith("_US")) return "US";
  if (source.endsWith("_UK")) return "UK";
  return "GLOBAL";
}

function timeoutAfter(ms: number, source: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${source}: timeout após ${ms}ms`)), ms)
  );
}

export function createScraperQueue(connection: ConnectionOptions): Queue {
  return new Queue(QUEUE_NAME, { connection });
}

/**
 * Enfileira um scraper (cron ou disparo manual) respeitando o lock de job
 * duplicado: se `source` já está rodando, retorna null e NÃO enfileira —
 * ignora silenciosamente, como pedido.
 */
export async function enqueueScraper(
  queue: Queue,
  lock: JobLock,
  source: string
): Promise<string | null> {
  if (!isKnownSource(source)) {
    throw new Error(`Fonte desconhecida: ${source}`);
  }

  const acquired = await lock.tryAcquire(source, LOCK_TTL_MS);
  if (!acquired) return null;

  const job = await queue.add(
    source,
    {},
    {
      jobId: `${source}-${Date.now()}`,
      attempts: MAX_ATTEMPTS,
      backoff: { type: "custom" },
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );

  return job.id ?? null;
}

async function enqueueFollowupJob(
  connection: ConnectionOptions,
  jobName: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const cycleId = todayCycleId();
  const queue = new Queue(QUEUE_NAME, { connection });
  try {
    await queue.add(jobName, data, { jobId: `${jobName}-${cycleId}`, removeOnComplete: true });
  } finally {
    await queue.close();
  }
}

async function onScraperCycleStepDone(
  jobName: string,
  barrier: CycleBarrier,
  connection: ConnectionOptions
): Promise<void> {
  if (!CYCLE_SCRAPER_SOURCES.includes(jobName)) return;

  const cycleId = todayCycleId();
  const complete = await barrier.markSourceDone(cycleId, jobName);
  if (!complete) return;

  await enqueueFollowupJob(connection, "SCORE_CALCULATOR", { cycleId });
}

/**
 * Worker que processa os jobs da fila de scrapers: publica status em
 * tempo real (Fase 7 vai ler isso via SSE), roda o scraper com timeout de
 * 8min, e — se `source` faz parte do ciclo diário — marca a barreira.
 * Um scraper que falha após esgotar as 3 tentativas ainda libera a
 * barreira (não trava o ciclo por causa de uma fonte só).
 */
export function createScraperWorker(connection: ConnectionOptions, redis: Redis): Worker {
  const barrier = new CycleBarrier(new RedisBarrierStore(redis), CYCLE_SCRAPER_SOURCES);
  const lock = new RedisJobLock(redis);

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const source = job.name;
      const runner = SCRAPER_RUNNERS[source];
      if (!runner) throw new Error(`Sem runner registrado para ${source}`);

      await publishStatus({ source, region: regionFor(source), state: "running" });

      try {
        const result = await Promise.race([runner(), timeoutAfter(JOB_TIMEOUT_MS, source)]);

        await publishStatus({
          source,
          region: regionFor(source),
          state: result.errors.length > 0 ? "partial" : "success",
          itemsFound: result.itemsFound,
        });

        return result;
      } catch (error) {
        await publishStatus({
          source,
          region: regionFor(source),
          state: "error",
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: MAX_CONCURRENT_SCRAPERS,
      settings: { backoffStrategy: (attemptsMade: number) => computeBackoffDelay(attemptsMade) },
    }
  );

  worker.on("completed", async (job) => {
    await lock.release(job.name);
    if (job.name === "SCORE_CALCULATOR") {
      // Fase 10: alertas só fazem sentido depois que o score do dia foi
      // recalculado — dispara como um job normal (mesma fila, mesmas
      // garantias de retry/timeout/status) em vez de chamar direto aqui.
      await enqueueFollowupJob(connection, "ALERT_CHECKER");
      return;
    }
    await onScraperCycleStepDone(job.name, barrier, connection);
  });

  worker.on("failed", async (job) => {
    if (!job) return;
    await lock.release(job.name);
    if ((job.attemptsMade ?? 0) >= MAX_ATTEMPTS) {
      // Esgotou as tentativas: conta como "terminado" pra não travar a barreira.
      await onScraperCycleStepDone(job.name, barrier, connection);
    }
  });

  return worker;
}
