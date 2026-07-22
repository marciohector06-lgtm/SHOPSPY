import { prisma } from "@shopspy/database";
import type { ScraperSource } from "@shopspy/shared";
import type { ScraperRunResult } from "./types";

/**
 * Executa `run` e registra o resultado em ScraperLog, seja sucesso, erro
 * parcial (algumas categorias falharam) ou timeout.
 */
export async function withScraperLog(
  source: ScraperSource,
  region: string,
  run: () => Promise<ScraperRunResult>
): Promise<ScraperRunResult> {
  const startedAt = Date.now();

  try {
    const result = await run();
    await prisma.scraperLog.create({
      data: {
        source,
        region,
        status: result.errors.length > 0 ? "partial" : "success",
        itemsFound: result.itemsFound,
        itemsNew: result.itemsNew,
        itemsUpdated: result.itemsUpdated,
        duration: Date.now() - startedAt,
        error: result.errors.length > 0 ? result.errors.join("; ") : null,
      },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.scraperLog.create({
      data: {
        source,
        region,
        status: "error",
        itemsFound: 0,
        itemsNew: 0,
        itemsUpdated: 0,
        duration: Date.now() - startedAt,
        error: message,
      },
    });
    throw error;
  }
}
