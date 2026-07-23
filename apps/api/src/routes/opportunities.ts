import { Router } from "express";
import { prisma } from "@shopspy/database";
import { isoWeek } from "@shopspy/shared";
import { authMiddleware } from "../lib/authMiddleware";
import { validate } from "../lib/validate";
import { reverseScores, scoresVideosInclude } from "../lib/productInclude";
import { opportunitiesTopQuerySchema, type OpportunitiesTopQuery } from "../schemas";

const FREE_DELAY_MS = 48 * 60 * 60 * 1000;
const FREE_LIMIT = 3;
const PRO_LIMIT = 100;
const NEW_48H_LIMIT = 6;

/**
 * Produtos com Product.createdAt dentro das últimas 48h, ordenados pelo
 * score mais recente disponível (produto sem score ainda fica no fim).
 * Sub-modo de /top, não um recurso separado — por isso reaproveita o
 * mesmo endpoint via ?filter=new48h em vez de uma rota própria.
 */
async function findNew48hOpportunities() {
  const cutoff = new Date(Date.now() - FREE_DELAY_MS);

  const rows = await prisma.product.findMany({
    where: { createdAt: { gte: cutoff } },
    include: scoresVideosInclude(4, 2),
  });

  const withLatestScore = rows.map(reverseScores).map((row) => ({
    row,
    latestScore: row.scores[row.scores.length - 1]?.scoreTotal ?? -1,
  }));

  withLatestScore.sort((a, b) => b.latestScore - a.latestScore);

  return withLatestScore.slice(0, NEW_48H_LIMIT).map(({ row }) => row);
}

/**
 * FREE vê só o top 3, com 48h de atraso (a semana ISO calculada a partir de
 * "agora - 48h", não da semana atual) — PRO vê tudo, em tempo real. Os
 * outros endpoints de oportunidade (/products) exigem PRO; este é o único
 * que dá algo (limitado) pro FREE em vez de bloquear.
 */
export function createOpportunitiesRouter(): Router {
  const router = Router();

  router.get("/top", authMiddleware, validate(opportunitiesTopQuerySchema, "query"), async (req, res) => {
    const { filter } = req.query as unknown as OpportunitiesTopQuery;

    if (filter === "new48h") {
      const items = await findNew48hOpportunities();
      res.json({ items, delayedAt: null });
      return;
    }

    const isPro = req.user!.plan === "PRO";
    const cutoff = isPro ? new Date() : new Date(Date.now() - FREE_DELAY_MS);
    const { weekNumber, year } = isoWeek(cutoff);
    const limit = isPro ? PRO_LIMIT : FREE_LIMIT;

    const topScores = await prisma.trendScore.findMany({
      where: { weekNumber, year },
      orderBy: { scoreTotal: "desc" },
      take: limit,
      select: { productId: true },
    });

    const productIds = topScores.map((s) => s.productId);
    const rows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: scoresVideosInclude(4, 2),
    });

    // findMany não preserva a ordem de `in` — reordena pelo rank de score já calculado.
    const rank = new Map(productIds.map((id, index) => [id, index]));
    const items = rows.map(reverseScores).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

    res.json({ items, delayedAt: isPro ? null : cutoff.toISOString() });
  });

  return router;
}
