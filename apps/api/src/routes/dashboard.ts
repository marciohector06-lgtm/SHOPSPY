import { Router } from "express";
import { prisma } from "@shopspy/database";
import { CATEGORIES } from "@shopspy/shared";
import { withCache } from "../lib/cache";
import { isoWeek } from "../lib/isoWeek";

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
   * série BR vs Global das últimas 8 semanas para as top 5 categorias.
   */
  router.get("/category-trends", async (_req, res) => {
    const data = await withCache(res, "dashboard:category-trends", 120, async () => {
      const { weekNumber, year } = isoWeek(new Date());

      const thisWeekScores = await prisma.trendScore.findMany({
        where: { weekNumber, year },
        select: { scoreTotal: true, product: { select: { category: true } } },
      });

      const heatmapTotals = new Map<string, { sum: number; count: number }>();
      for (const row of thisWeekScores) {
        const entry = heatmapTotals.get(row.product.category) ?? { sum: 0, count: 0 };
        entry.sum += row.scoreTotal;
        entry.count += 1;
        heatmapTotals.set(row.product.category, entry);
      }
      const heatmap = CATEGORIES.map((category) => {
        const entry = heatmapTotals.get(category);
        return { category, averageScore: entry ? entry.sum / entry.count : null };
      });

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

      return { weeks: last8Weeks, categories, heatmap };
    });

    res.json(data);
  });

  return router;
}
