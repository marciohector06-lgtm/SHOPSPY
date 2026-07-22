import { prisma } from "@shopspy/database";
import { isoWeek } from "@shopspy/shared";
import { renderOpportunityEmail } from "@shopspy/ai";
import { sendEmail } from "./resend";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface AlertCheckResult {
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
  errors: string[];
}

/**
 * Roda depois que o SCORE_CALCULATOR termina o ciclo do dia (enfileirado
 * no "completed" do worker, ver jobs.ts). Busca todo alerta ATIVO cujo
 * produto ultrapassou o threshold na semana atual e que não disparou nas
 * últimas 24h, manda o e-mail (Resend) e só então atualiza
 * lastFiredAt/fireCount — se o e-mail falhar, o alerta continua elegível
 * pro próximo ciclo em vez de ser marcado como "avisado" sem ter avisado.
 * Canais fora de email (whatsapp/push) são ignorados por ora — ainda não
 * implementados.
 */
export async function runAlertChecker(): Promise<AlertCheckResult> {
  const { weekNumber, year } = isoWeek(new Date());
  const appUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

  const activeAlerts = await prisma.alert.findMany({
    where: { active: true },
    include: {
      user: { select: { email: true } },
      product: {
        select: {
          id: true,
          name: true,
          commissionValueBR: true,
          scores: { where: { weekNumber, year }, take: 1 },
        },
      },
    },
  });

  const errors: string[] = [];
  let itemsUpdated = 0;

  for (const alert of activeAlerts) {
    if (alert.channel !== "email") continue;

    const score = alert.product.scores[0];
    if (!score || score.scoreTotal < alert.threshold) continue;

    const cooledDown = !alert.lastFiredAt || Date.now() - alert.lastFiredAt.getTime() >= COOLDOWN_MS;
    if (!cooledDown) continue;

    const { subject, html } = renderOpportunityEmail({
      productName: alert.product.name,
      productId: alert.product.id,
      scoreTotal: score.scoreTotal,
      classification: score.classification,
      windowLabel: score.windowLabel,
      commissionValueBR: alert.product.commissionValueBR,
      appUrl,
    });

    const result = await sendEmail(alert.user.email, subject, html);
    if (!result.ok) {
      errors.push(`alerta ${alert.id} (${alert.product.name}): ${result.error}`);
      continue;
    }

    await prisma.alert.update({
      where: { id: alert.id },
      data: { lastFiredAt: new Date(), fireCount: { increment: 1 } },
    });
    itemsUpdated++;
  }

  return { itemsFound: activeAlerts.length, itemsNew: 0, itemsUpdated, errors };
}
