import { prisma } from "@shopspy/database";
import { isoWeek, EXPLOSIVE_GROWTH_THRESHOLD, INTERNATIONAL_REGIONS, type InternationalRegion } from "@shopspy/shared";
import { withScraperLog } from "../shared/runLog";
import { fetchTrendsSummary, chunkKeywords, sleep } from "../shared/trends";
import type { ScraperRunResult } from "../shared/types";

const REGION_GEO: Record<InternationalRegion, string> = {
  MX: "MX",
  CO: "CO",
  AR: "AR",
  CL: "CL",
  TH: "TH",
  ID: "ID",
  VN: "VN",
  JP: "JP",
  FR: "FR",
  DE: "DE",
  IT: "IT",
};

const REGIONS = Object.keys(INTERNATIONAL_REGIONS) as InternationalRegion[];

/**
 * Busca Google Trends nas 11 regiões internacionais (LATAM/Ásia/Europa) para
 * cada produto monitorado e grava em RegionalScore. weeklyGrowth vem pronto
 * de `fetchTrendsSummary` (compara os 2 últimos pontos da timeline de 3
 * meses) — não precisamos comparar manualmente com o RegionalScore da
 * semana anterior, o cálculo já é semana-a-semana na origem.
 */
export async function runGoogleTrendsInternationalScraper(): Promise<ScraperRunResult> {
  return withScraperLog("GOOGLE_TRENDS_INTERNATIONAL", "GLOBAL", async () => {
    const { weekNumber, year } = isoWeek(new Date());

    const products = await prisma.product.findMany({
      where: { status: { in: ["MONITORING", "OPPORTUNITY"] } },
      select: { id: true, name: true, nameEn: true },
    });

    const batches = chunkKeywords(products, 5);
    let itemsFound = 0;
    let itemsNew = 0;
    let itemsUpdated = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (product) => {
          const keyword = product.nameEn ?? product.name;

          for (const region of REGIONS) {
            try {
              const summary = await fetchTrendsSummary(keyword, REGION_GEO[region]);
              const isExplosive = summary.weeklyChangePct >= EXPLOSIVE_GROWTH_THRESHOLD;

              itemsFound++;
              const data = {
                productId: product.id,
                region,
                trendScore: summary.currentScore,
                weeklyGrowth: summary.weeklyChangePct,
                isExplosive,
                weekNumber,
                year,
              };

              const existing = await prisma.regionalScore.findUnique({
                where: { productId_region_weekNumber_year: { productId: product.id, region, weekNumber, year } },
              });

              await prisma.regionalScore.upsert({
                where: { productId_region_weekNumber_year: { productId: product.id, region, weekNumber, year } },
                create: data,
                update: data,
              });

              if (existing) itemsUpdated++;
              else itemsNew++;
            } catch (error) {
              errors.push(`${keyword}/${region}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        })
      );
      await sleep(3000);
    }

    return { itemsFound, itemsNew, itemsUpdated, errors };
  });
}
