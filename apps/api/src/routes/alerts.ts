import { Router } from "express";
import { prisma } from "@shopspy/database";
import { authMiddleware } from "../lib/authMiddleware";
import { validate } from "../lib/validate";
import { createAlertSchema, idParamSchema, type CreateAlertBody } from "../schemas";

/**
 * Autenticação exigida em todas — mas NÃO é PRO-only: FREE pode criar até
 * `alertsLimit` (padrão 3) alertas, PRO não tem limite. Isso é o que o
 * teste "criação além do limite FREE retorna 403" valida.
 */
export function createAlertsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  /**
   * Alerta duplicado (mesmo produto) atualiza o threshold/canal em vez de
   * criar outro — @@unique([userId, productId]) no schema garante isso no
   * banco, aqui só evitamos o 500 de constraint violation fazendo o
   * findUnique primeiro. Atualizar um alerta existente NÃO conta contra o
   * limite do FREE (só criação nova incrementa alertsUsed).
   */
  router.post("/", validate(createAlertSchema, "body"), async (req, res) => {
    const body = req.body as CreateAlertBody;
    const userId = req.user!.id;

    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) {
      res.status(404).json({ error: "produto não encontrado" });
      return;
    }

    const existing = await prisma.alert.findUnique({
      where: { userId_productId: { userId, productId: body.productId } },
    });

    if (existing) {
      const updated = await prisma.alert.update({
        where: { id: existing.id },
        data: { threshold: body.threshold, channel: body.channel, active: true },
      });
      res.status(200).json(updated);
      return;
    }

    if (req.user!.plan === "FREE") {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.alertsUsed >= user.alertsLimit) {
        res.status(403).json({ error: "ALERT_LIMIT_REACHED", limit: user?.alertsLimit ?? 0, upgradeUrl: "/pricing" });
        return;
      }
    }

    const alert = await prisma.$transaction(async (tx) => {
      const created = await tx.alert.create({
        data: { userId, productId: body.productId, threshold: body.threshold, channel: body.channel },
      });
      await tx.user.update({ where: { id: userId }, data: { alertsUsed: { increment: 1 } } });
      return created;
    });

    res.status(201).json(alert);
  });

  /**
   * `usage.limit` vem `null` pro PRO (sem limite) — o frontend usa isso
   * pra decidir se mostra o contador "X de Y alertas disponíveis" no modal
   * de criação (FREE) ou nada (PRO).
   */
  router.get("/", async (req, res) => {
    const [alerts, user] = await Promise.all([
      prisma.alert.findMany({
        where: { userId: req.user!.id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              imageUrl: true,
              scores: { orderBy: [{ year: "desc" as const }, { weekNumber: "desc" as const }], take: 1 },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      req.user!.plan === "FREE" ? prisma.user.findUnique({ where: { id: req.user!.id } }) : null,
    ]);

    const usage =
      req.user!.plan === "FREE" ? { used: user?.alertsUsed ?? 0, limit: user?.alertsLimit ?? 0 } : { used: alerts.length, limit: null };

    res.json({ items: alerts, usage });
  });

  router.patch("/:id/toggle", validate(idParamSchema, "params"), async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const alert = await prisma.alert.findUnique({ where: { id } });

    if (!alert || alert.userId !== req.user!.id) {
      res.status(404).json({ error: "alerta não encontrado" });
      return;
    }

    const updated = await prisma.alert.update({ where: { id }, data: { active: !alert.active } });
    res.json(updated);
  });

  router.delete("/:id", validate(idParamSchema, "params"), async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const alert = await prisma.alert.findUnique({ where: { id } });

    if (!alert || alert.userId !== req.user!.id) {
      res.status(404).json({ error: "alerta não encontrado" });
      return;
    }

    await prisma.$transaction([
      prisma.alert.delete({ where: { id } }),
      prisma.user.update({ where: { id: req.user!.id }, data: { alertsUsed: { decrement: 1 } } }),
    ]);

    res.status(204).send();
  });

  return router;
}
