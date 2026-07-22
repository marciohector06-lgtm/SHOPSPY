import { prisma } from "@shopspy/database";
import { withScraperLog } from "../shared/runLog";
import { fetchTrendsSummary, chunkKeywords, sleep } from "../shared/trends";
import type { ScraperRunResult } from "../shared/types";

export { parseGoogleTrendsResponse, chunkKeywords, type TrendsSummary } from "../shared/trends";

export async function runGoogleTrendsBRScraper(): Promise<ScraperRunResult> {
  return withScraperLog("GOOGLE_TRENDS_BR", "BR", async () => {
    const products = await prisma.product.findMany({
      where: { status: { in: ["MONITORING", "OPPORTUNITY"] } },
      select: { id: true, name: true },
    });

    const batches = chunkKeywords(products, 5);
    let itemsFound = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (product) => {
          try {
            const summary = await fetchTrendsSummary(product.name, "BR");
            itemsFound++;
            await prisma.product.update({
              where: { id: product.id },
              data: { searchesBR: Math.round(summary.currentScore) },
            });
            itemsUpdated++;
          } catch (error) {
            errors.push(
              `${product.name}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })
      );
      await sleep(3000);
    }

    return { itemsFound, itemsNew: 0, itemsUpdated, errors };
  });
}
