import { prisma } from "@shopspy/database";
import { GLOBAL_TRENDS_WEIGHTS } from "@shopspy/shared";
import { withScraperLog } from "../shared/runLog";
import { cacheSet } from "../shared/cache";
import { fetchTrendsSummary, chunkKeywords, sleep, type TrendsSummary } from "../shared/trends";
import type { ScraperRunResult } from "../shared/types";

export interface GlobalTrendsBreakdown {
  US: TrendsSummary;
  UK: TrendsSummary;
  AU: TrendsSummary;
  CA: TrendsSummary;
}

/** Pura: média ponderada dos scores atuais de cada região (US 40% / UK 25% / AU 20% / CA 15%). */
export function computeGlobalTrendsIndex(breakdown: GlobalTrendsBreakdown): number {
  return (
    breakdown.US.currentScore * GLOBAL_TRENDS_WEIGHTS.US +
    breakdown.UK.currentScore * GLOBAL_TRENDS_WEIGHTS.UK +
    breakdown.AU.currentScore * GLOBAL_TRENDS_WEIGHTS.AU +
    breakdown.CA.currentScore * GLOBAL_TRENDS_WEIGHTS.CA
  );
}

/**
 * Pura: gap entre o índice global e o score BR do mesmo produto.
 * gap > 40 = oportunidade máxima | gap > 20 = oportunidade alta | gap <= 10 = chegou tarde.
 */
export function computeGap(globalIndex: number, brScore: number): number {
  return globalIndex - brScore;
}

async function fetchGlobalBreakdown(keyword: string): Promise<GlobalTrendsBreakdown> {
  const [US, UK, AU, CA] = await Promise.all([
    fetchTrendsSummary(keyword, "US"),
    fetchTrendsSummary(keyword, "GB"),
    fetchTrendsSummary(keyword, "AU"),
    fetchTrendsSummary(keyword, "CA"),
  ]);
  return { US, UK, AU, CA };
}

/**
 * Não persiste em TrendScore: esse model exige o score completo (Fase 5,
 * Score Engine), que ainda vai combinar isso com comissão/social proof/UGC.
 * Por ora, guardamos o breakdown bruto no Redis para o Score Engine consumir,
 * em vez de inventar uma escrita parcial que não respeita o schema atual.
 */
export async function runGoogleTrendsGlobalScraper(): Promise<ScraperRunResult> {
  return withScraperLog("GOOGLE_TRENDS_US", "GLOBAL", async () => {
    const products = await prisma.product.findMany({
      where: { status: { in: ["MONITORING", "OPPORTUNITY"] } },
      select: { id: true, name: true, nameEn: true, searchesBR: true },
    });

    const batches = chunkKeywords(products, 5);
    let itemsFound = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (product) => {
          const keyword = product.nameEn ?? product.name;
          try {
            const breakdown = await fetchGlobalBreakdown(keyword);
            const globalIndex = computeGlobalTrendsIndex(breakdown);
            const gap = computeGap(globalIndex, product.searchesBR ?? 0);

            itemsFound++;
            await cacheSet(
              `trends-global:${product.id}`,
              { breakdown, globalIndex, gap },
              24 * 60 * 60
            );
            itemsUpdated++;
          } catch (error) {
            errors.push(`${keyword}: ${error instanceof Error ? error.message : String(error)}`);
          }
        })
      );
      await sleep(3000);
    }

    return { itemsFound, itemsNew: 0, itemsUpdated, errors };
  });
}
