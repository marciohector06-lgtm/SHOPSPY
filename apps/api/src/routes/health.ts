import { Router } from "express";
import { parseExpression } from "cron-parser";
import { prisma, type ScraperSource } from "@shopspy/database";
import { SCRAPER_SOURCES } from "@shopspy/shared";
import { SCHEDULES, CYCLE_SCRAPER_SOURCES, TIMEZONE } from "@shopspy/queue";
import { getRedis } from "../lib/redis";

export const healthRouter = Router();

async function checkDatabase(): Promise<"up" | "down"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "up";
  } catch {
    return "down";
  }
}

async function checkRedis(): Promise<"up" | "down"> {
  try {
    const pong = await getRedis().ping();
    return pong === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
}

function nextRunFor(cron: string): string | null {
  if (cron === "triggered") return null;
  try {
    return parseExpression(cron, { tz: TIMEZONE }).next().toDate().toISOString();
  } catch {
    return null;
  }
}

async function scraperStatuses() {
  const scraperEntries = SCHEDULES.filter((entry) =>
    (SCRAPER_SOURCES as readonly string[]).includes(entry.source)
  );

  return Promise.all(
    scraperEntries.map(async (entry) => {
      const lastLog = await prisma.scraperLog.findFirst({
        where: { source: entry.source as ScraperSource },
        orderBy: { createdAt: "desc" },
      });

      return {
        source: entry.source,
        lastRun: lastLog
          ? { at: lastLog.createdAt.toISOString(), status: lastLog.status, itemsFound: lastLog.itemsFound }
          : null,
        nextRun: nextRunFor(entry.cron),
      };
    })
  );
}

async function lastCycleStatus() {
  const cycleId = new Date().toISOString().slice(0, 10);
  const logs = await prisma.scraperLog.findMany({
    where: {
      source: { in: CYCLE_SCRAPER_SOURCES as ScraperSource[] },
      createdAt: { gte: new Date(`${cycleId}T00:00:00.000Z`) },
    },
  });

  const doneSources = new Set(logs.map((log) => log.source));
  const totalSources = CYCLE_SCRAPER_SOURCES.length;
  const hasErrors = logs.some((log) => log.status === "error");

  const status =
    doneSources.size === 0
      ? "pending"
      : doneSources.size < totalSources
        ? "in_progress"
        : hasErrors
          ? "degraded"
          : "completed";

  return { cycleId, status, completedSources: doneSources.size, totalSources };
}

/**
 * Sem cache de propósito — este endpoint existe pra refletir o estado real
 * agora (banco, Redis, próxima execução de cada scraper), não uma foto de
 * alguns segundos atrás.
 */
healthRouter.get("/", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const [database, redis, scrapers, lastCycle] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    scraperStatuses(),
    lastCycleStatus(),
  ]);

  const status = database === "up" && redis === "up" ? "ok" : "degraded";

  res.json({
    status,
    timestamp: new Date().toISOString(),
    components: { database, redis },
    lastCycle,
    scrapers,
  });
});
