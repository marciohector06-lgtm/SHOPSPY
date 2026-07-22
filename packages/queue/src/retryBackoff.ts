const BACKOFF_MS = [5 * 60_000, 15 * 60_000, 30 * 60_000];

/**
 * Backoff por tentativa: 5min, 15min, 30min (não multiplicativo). BullMQ
 * chama isso com attemptsMade=1 na primeira falha (antes do 2º attempt).
 */
export function computeBackoffDelay(attemptsMade: number): number {
  const index = Math.min(attemptsMade - 1, BACKOFF_MS.length - 1);
  return BACKOFF_MS[Math.max(index, 0)]!;
}

export const MAX_ATTEMPTS = 3;
export const JOB_TIMEOUT_MS = 8 * 60_000;
export const MAX_CONCURRENT_SCRAPERS = 2;
