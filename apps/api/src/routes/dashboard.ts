import { Router } from "express";
import { prisma } from "@shopspy/database";
import { CATEGORIES, SCORE_CLASSES, isoWeek, INTERNATIONAL_REGIONS, type InternationalRegion } from "@shopspy/shared";
import { withCache } from "../lib/cache";
import { validate } from "../lib/validate";
import { regionalHeatmapQuerySchema, type RegionalHeatmapQuery } from "../schemas";

export function createDashboardRouter(): Router {
  const router = Router();

  /**
   * Agregados do dashboard — uma única viagem ao banco em vez de o
   * frontend montar isso na mão a partir de /products (que nem exporia
   * COUNT, de propósito, por causa da paginação cursor-based).
   */
  router.get("/summary", async (_req, res) => {
    const { weekNumber, year } = isoWeek(new Date());
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

    const summary = await withCache(res, `dashboard:summary:${weekNumber}:${year}`, 60, async () => {
      const [monitoredProducts, newProductsLast48h, alertsFiredToday, bestScoreAgg, weekScores, topOpportunities] =
        await Promise.all([
          prisma.product.count({ where: { status: { in: ["MONITORING", "OPPORTUNITY"] } } }),
          prisma.product.count({ where: { createdAt: { gte: fortyEightHoursAgo } } }),
          prisma.alert.count({ where: { lastFiredAt: { gte: todayStart } } }),
          prisma.trendScore.aggregate({ where: { weekNumber, year }, _max: { scoreTotal: true } }),
          prisma.trendScore.findMany({
            where: { weekNumber, year },
            select: { scoreTotal: true, product: { select: { category: true } } },
          }),
          prisma.trendScore.findMany({
            where: { weekNumber, year },
            orderBy: { scoreTotal: "desc" },
            take: 5,
            include: { product: { select: { id: true, name: true, category: true, commissionValueBR: true } } },
          }),
        ]);

      const categoryTotals = new Map<string, { sum: number; count: number }>();
      for (const row of weekScores) {
        const entry = categoryTotals.get(row.product.category) ?? { sum: 0, count: 0 };
        entry.sum += row.scoreTotal;
        entry.count += 1;
        categoryTotals.set(row.product.category, entry);
      }

      const topCategories = [...categoryTotals.entries()]
        .map(([category, { sum, count }]) => ({ category, averageScore: sum / count }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5);

      return {
        weekNumber,
        year,
        monitoredProducts,
        newProductsLast48h,
        alertsFiredToday,
        bestScoreThisWeek: bestScoreAgg._max.scoreTotal ?? null,
        topCategories,
        topOpportunities: topOpportunities.map((score) => ({
          productId: score.productId,
          name: score.product.name,
          category: score.product.category,
          commissionValueBR: score.product.commissionValueBR,
          scoreTotal: score.scoreTotal,
          classification: score.classification,
          windowLabel: score.windowLabel,
        })),
      };
    });

    res.json(summary);
  });

  /**
   * Heatmap (todas as categorias, score médio da semana atual — null onde
   * não há dado, para o frontend distinguir "0" de "sem score ainda") +
   * série BR vs Global das últimas 8 semanas para as top 5 categorias +
   * distribuição de produtos por classificação (semana atual).
   */
  router.get("/category-trends", async (_req, res) => {
    const data = await withCache(res, "dashboard:category-trends", 120, async () => {
      const { weekNumber, year } = isoWeek(new Date());
      const previous = isoWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      const [thisWeekScores, previousWeekScores] = await Promise.all([
        prisma.trendScore.findMany({
          where: { weekNumber, year },
          select: { scoreTotal: true, classification: true, product: { select: { category: true } } },
        }),
        prisma.trendScore.findMany({
          where: { weekNumber: previous.weekNumber, year: previous.year },
          select: { scoreTotal: true, product: { select: { category: true } } },
        }),
      ]);

      const heatmap = buildHeatmap(
        thisWeekScores.map((r) => ({ category: r.product.category, value: r.scoreTotal })),
        previousWeekScores.map((r) => ({ category: r.product.category, value: r.scoreTotal }))
      );

      const classificationDistribution = Object.fromEntries(SCORE_CLASSES.map((c) => [c, 0])) as Record<
        (typeof SCORE_CLASSES)[number],
        number
      >;
      for (const row of thisWeekScores) {
        classificationDistribution[row.classification] += 1;
      }

      // Amostra recente de linhas cruas (não só a semana atual) pra montar a
      // série histórica por categoria — agregada em memória, não em SQL, pelo
      // volume esperado (produtos monitorados x algumas semanas) ser pequeno.
      const recentScores = await prisma.trendScore.findMany({
        orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
        take: 3000,
        select: {
          weekNumber: true,
          year: true,
          trendsBR: true,
          trendsUS: true,
          scoreTotal: true,
          product: { select: { category: true } },
        },
      });

      const weekKey = (w: number, y: number) => `${y}-S${String(w).padStart(2, "0")}`;
      interface Bucket {
        sumBR: number;
        sumUS: number;
        sumScore: number;
        count: number;
      }
      const byCategoryWeek = new Map<string, Map<string, Bucket>>();
      const weekOrder: string[] = [];

      for (const row of recentScores) {
        const wk = weekKey(row.weekNumber, row.year);
        if (!weekOrder.includes(wk)) weekOrder.push(wk);

        const catMap = byCategoryWeek.get(row.product.category) ?? new Map<string, Bucket>();
        const bucket = catMap.get(wk) ?? { sumBR: 0, sumUS: 0, sumScore: 0, count: 0 };
        bucket.sumBR += row.trendsBR;
        bucket.sumUS += row.trendsUS;
        bucket.sumScore += row.scoreTotal;
        bucket.count += 1;
        catMap.set(wk, bucket);
        byCategoryWeek.set(row.product.category, catMap);
      }

      const last8Weeks = weekOrder.slice(0, 8).reverse(); // weekOrder vem desc; volta pra ordem cronológica
      const latestWeek = weekOrder[0];

      const topCategoriesThisWeek = [...byCategoryWeek.entries()]
        .map(([category, weeks]) => {
          const bucket = latestWeek ? weeks.get(latestWeek) : undefined;
          return { category, score: bucket ? bucket.sumScore / bucket.count : -1 };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((c) => c.category);

      const categories = topCategoriesThisWeek.map((category) => {
        const weeks = byCategoryWeek.get(category)!;
        return {
          category,
          series: last8Weeks.map((week) => {
            const bucket = weeks.get(week);
            return {
              week,
              avgTrendsBR: bucket ? bucket.sumBR / bucket.count : null,
              avgTrendsUS: bucket ? bucket.sumUS / bucket.count : null,
            };
          }),
        };
      });

      return { weeks: last8Weeks, categories, heatmap, classificationDistribution };
    });

    res.json(data);
  });

  /**
   * Heatmap por categoria pra um grupo de regiões internacionais (aba
   * LATAM/Ásia/Europa/Global de /tendencias — packages/shared/src/constants.ts
   * INTERNATIONAL_REGIONS.group). GLOBAL usa TrendScore.trendsUS (já existe,
   * mesma fonte da comparação BR x Global atual); LATAM/ASIA/EUROPE usam
   * RegionalScore.trendScore (Fase 4, packages/scrapers/src/global/google-trends-international.ts).
   * Mesmo shape de resposta do heatmap BR (`CategoryHeatmapEntry[]`), pra
   * reaproveitar o componente CategoryHeatmap sem mudança nenhuma nele.
   */
  router.get(
    "/regional-heatmap",
    validate(regionalHeatmapQuerySchema, "query"),
    async (req, res) => {
      const { region } = req.query as unknown as RegionalHeatmapQuery;

      const data = await withCache(res, `dashboard:regional-heatmap:${region}`, 120, async () => {
        const { weekNumber, year } = isoWeek(new Date());
        const previous = isoWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

        if (region === "GLOBAL") {
          const [thisWeek, previousWeek] = await Promise.all([
            prisma.trendScore.findMany({
              where: { weekNumber, year },
              select: { trendsUS: true, product: { select: { category: true } } },
            }),
            prisma.trendScore.findMany({
              where: { weekNumber: previous.weekNumber, year: previous.year },
              select: { trendsUS: true, product: { select: { category: true } } },
            }),
          ]);
          return buildHeatmap(
            thisWeek.map((r) => ({ category: r.product.category, value: r.trendsUS })),
            previousWeek.map((r) => ({ category: r.product.category, value: r.trendsUS }))
          );
        }

        const countries = (Object.entries(INTERNATIONAL_REGIONS) as Array<[InternationalRegion, { group: string }]>)
          .filter(([, config]) => config.group === region)
          .map(([code]) => code);

        const [thisWeek, previousWeek] = await Promise.all([
          prisma.regionalScore.findMany({
            where: { region: { in: countries }, weekNumber, year },
            select: { trendScore: true, product: { select: { category: true } } },
          }),
          prisma.regionalScore.findMany({
            where: { region: { in: countries }, weekNumber: previous.weekNumber, year: previous.year },
            select: { trendScore: true, product: { select: { category: true } } },
          }),
        ]);
        return buildHeatmap(
          thisWeek.map((r) => ({ category: r.product.category, value: r.trendScore })),
          previousWeek.map((r) => ({ category: r.product.category, value: r.trendScore }))
        );
      });

      res.json(data);
    }
  );

  return router;
}

function buildHeatmap(
  thisWeek: Array<{ category: string; value: number }>,
  previousWeek: Array<{ category: string; value: number }>
) {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of thisWeek) {
    const entry = totals.get(row.category) ?? { sum: 0, count: 0 };
    entry.sum += row.value;
    entry.count += 1;
    totals.set(row.category, entry);
  }

  const previousTotals = new Map<string, { sum: number; count: number }>();
  for (const row of previousWeek) {
    const entry = previousTotals.get(row.category) ?? { sum: 0, count: 0 };
    entry.sum += row.value;
    entry.count += 1;
    previousTotals.set(row.category, entry);
  }

  return CATEGORIES.map((category) => {
    const entry = totals.get(category);
    const averageScore = entry ? entry.sum / entry.count : null;

    const previousEntry = previousTotals.get(category);
    const previousAverage = previousEntry ? previousEntry.sum / previousEntry.count : null;
    const weeklyChangePct =
      averageScore !== null && previousAverage !== null && previousAverage > 0
        ? ((averageScore - previousAverage) / previousAverage) * 100
        : null;

    return { category, averageScore, weeklyChangePct };
  });
}
