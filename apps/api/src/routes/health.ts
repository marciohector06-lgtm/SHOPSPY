import { Router } from "express";
import { prisma } from "@shopspy/database";
import { SCRAPER_SOURCES } from "@shopspy/shared";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let dbStatus: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }

  res.json({
    status: "ok",
    db: dbStatus,
    scraperSources: SCRAPER_SOURCES,
    timestamp: new Date().toISOString(),
  });
});
