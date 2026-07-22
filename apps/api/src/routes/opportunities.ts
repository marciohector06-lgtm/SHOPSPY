import { Router } from "express";
import { prisma } from "@shopspy/database";
import { isoWeek } from "@shopspy/shared";
import { authMiddleware } from "../lib/authMiddleware";
import { reverseScores, scoresVideosInclude } from "../lib/productInclude";

const FREE_DELAY_MS = 48 * 60 * 60 * 1000;
const FREE_LIMIT = 3;
const PRO_LIMIT = 100;

/**
 * FREE vê só o top 3, com 48h de atraso (a semana ISO calculada a partir de
 * "agora - 48h", não da semana atual) — PRO vê tudo, em tempo real. Os
 * outros endpoints de oportunidade (/products) exigem PRO; este é o único
 * que dá algo (limitado) pro FREE em vez de bloquear.
 */
export function createOpportunitiesRouter(): Router {
  const router = Router();

  router.get("/top", authMiddleware, async (req, res) => {
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
