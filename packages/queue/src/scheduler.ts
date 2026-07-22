import { schedule, type ScheduledTask } from "node-cron";
import type { Queue } from "bullmq";
import type { JobLock } from "./jobLock";
import { enqueueScraper } from "./jobs";
import { SCHEDULES, TIMEZONE } from "./schedules";

/**
 * Usa node-cron (não o job-scheduler nativo do BullMQ) de propósito: o
 * BullMQ enfileiraria direto, sem passar pelo lock de job duplicado.
 * Com node-cron, cada tick chama `enqueueScraper`, que checa o lock
 * ANTES de adicionar à fila — se o job anterior ainda está rodando, o
 * disparo é ignorado silenciosamente e nem chega a virar um job novo.
 */
export function registerSchedules(queue: Queue, lock: JobLock): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];

  for (const entry of SCHEDULES) {
    if (entry.cron === "triggered") continue;

    const task = schedule(
      entry.cron,
      () => {
        void enqueueScraper(queue, lock, entry.source);
      },
      { timezone: TIMEZONE }
    );
    tasks.push(task);
  }

  return tasks;
}
