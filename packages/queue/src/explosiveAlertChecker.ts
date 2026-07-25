import { prisma } from "@shopspy/database";
import { renderExplosiveGrowthEmail } from "@shopspy/ai";
import { sendEmail } from "./resend";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // mesmo cooldown/campos do alertChecker.ts — evita duplicar aviso do mesmo produto
const LOOKBACK_MS = 2 * 60 * 60 * 1000; // roda a cada 2h (schedules.ts), olha só o que virou isExplosive nesse intervalo

export interface ExplosiveAlert {
  productId: string;
  productName: string;
  region: string;
  weeklyGrowth: number;
  currentScore: number;
  detectedAt: Date;
}

export interface ExplosiveAlertResult {
  itemsFound: number;
  itemsNew: number;
  itemsUpdated: number;
  errors: string[];
}

interface RawExplosiveScore {
  productId: string;
  product: { name: string };
  region: string;
  weeklyGrowth: number;
  trendScore: number;
  createdAt: Date;
}

/** Pura: separa o shape do Prisma do shape público de ExplosiveAlert, testável sem mocks. */
export function toExplosiveAlerts(scores: RawExplosiveScore[]): ExplosiveAlert[] {
  return scores.map((s) => ({
    productId: s.productId,
    productName: s.product.name,
    region: s.region,
    weeklyGrowth: s.weeklyGrowth,
    currentScore: s.trendScore,
    detectedAt: s.createdAt,
  }));
}

/** Busca RegionalScore marcados isExplosive nas últimas 2h (populados por google-trends-international.ts). */
export async function detectExplosiveGrowth(): Promise<ExplosiveAlert[]> {
  const scores = await prisma.regionalScore.findMany({
    where: { isExplosive: true, createdAt: { gte: new Date(Date.now() - LOOKBACK_MS) } },
    include: { product: { select: { name: true } } },
  });
  return toExplosiveAlerts(scores);
}

/**
 * Roda a cada 2h (packages/queue/src/schedules.ts, fonte EXPLOSIVE_DETECTOR).
 * Para cada crescimento explosivo detectado, avisa os usuários PRO com
 * alerta ATIVO nesse produto — sem checar threshold (crescimento explosivo
 * é um gatilho à parte do score normal, mesma decisão do spec original) e
 * restrito a PRO (feature paga). Cooldown de 24h compartilhado com
 * alertChecker.ts (mesmo Alert.lastFiredAt) pra não duplicar aviso do
 * mesmo produto em dois canais diferentes na mesma janela.
 */
export async function runExplosiveAlertChecker(): Promise<ExplosiveAlertResult> {
  const startedAt = Date.now();

  try {
    const result = await checkAndNotify();
    await prisma.scraperLog.create({
      data: {
        source: "EXPLOSIVE_DETECTOR",
        region: "GLOBAL",
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
        source: "EXPLOSIVE_DETECTOR",
        region: "GLOBAL",
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

async function checkAndNotify(): Promise<ExplosiveAlertResult> {
  const appUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const alerts = await detectExplosiveGrowth();

  const errors: string[] = [];
  let itemsUpdated = 0;

  for (const alert of alerts) {
    const userAlerts = await prisma.alert.findMany({
      where: { productId: alert.productId, active: true, user: { plan: "PRO" } },
      include: { user: { select: { email: true } } },
    });

    for (const userAlert of userAlerts) {
      const cooledDown = !userAlert.lastFiredAt || Date.now() - userAlert.lastFiredAt.getTime() >= COOLDOWN_MS;
      if (!cooledDown) continue;

      const { subject, html } = renderExplosiveGrowthEmail({
        productName: alert.productName,
        productId: alert.productId,
        region: alert.region,
        weeklyGrowth: alert.weeklyGrowth,
        currentScore: alert.currentScore,
        appUrl,
      });

      const result = await sendEmail(userAlert.user.email, subject, html);
      if (!result.ok) {
        errors.push(`alerta ${userAlert.id} (${alert.productName}): ${result.error}`);
        continue;
      }

      await prisma.alert.update({
        where: { id: userAlert.id },
        data: { lastFiredAt: new Date(), fireCount: { increment: 1 } },
      });
      itemsUpdated++;
    }
  }

  return { itemsFound: alerts.length, itemsNew: 0, itemsUpdated, errors };
}
