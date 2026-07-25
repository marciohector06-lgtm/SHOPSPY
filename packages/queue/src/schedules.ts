export type CyclePhase = "global" | "brazil" | "processing" | "maintenance" | "international";

export interface ScheduleEntry {
  source: string;
  /** Cron de 5 campos (min hora dia mês dia-da-semana), fuso America/Sao_Paulo. */
  cron: string | "triggered";
  phase: CyclePhase;
}

/**
 * Ordem crítica: globais sempre ANTES dos BR no mesmo ciclo — o gap
 * analyzer (Fase 5) precisa dos dados globais já salvos quando os
 * scrapers BR rodarem, senão o gap calculado fica errado (comparando
 * contra dado global desatualizado do dia anterior).
 */
export const SCHEDULES: ScheduleEntry[] = [
  // ─── Global (3h-5h30) ───────────────────────────────────────────────────
  { source: "ALIEXPRESS_GLOBAL", cron: "0 3 * * *", phase: "global" },
  { source: "AMAZON_US", cron: "30 3 * * *", phase: "global" },
  { source: "AMAZON_UK", cron: "0 4 * * *", phase: "global" },
  { source: "TIKTOK_CREATIVE_US", cron: "30 4 * * *", phase: "global" },
  { source: "TIKTOK_SHOP_US", cron: "0 5 * * *", phase: "global" },
  { source: "GOOGLE_TRENDS_US", cron: "30 5 * * *", phase: "global" }, // trends global combinado (Fase 3)

  // ─── Brasil (6h-7h) ─────────────────────────────────────────────────────
  { source: "SHOPEE_BR", cron: "0 6 * * *", phase: "brazil" },
  { source: "TIKTOK_SHOP_BR", cron: "20 6 * * *", phase: "brazil" },
  { source: "MERCADOLIVRE_BR", cron: "40 6 * * *", phase: "brazil" },
  { source: "GOOGLE_TRENDS_BR", cron: "0 7 * * *", phase: "brazil" },

  // ─── Processamento (8h-11h) ─────────────────────────────────────────────
  { source: "SCORE_CALCULATOR", cron: "triggered", phase: "processing" }, // liberado pela barreira, não por cron
  { source: "VIDEO_COLLECTOR", cron: "0 9 * * *", phase: "processing" },
  { source: "OPPORTUNITY_AI", cron: "0 10 * * *", phase: "processing" },
  { source: "BR_MATCHER", cron: "30 10 * * *", phase: "processing" },
  { source: "ALERT_CHECKER", cron: "triggered", phase: "processing" }, // liberado quando SCORE_CALCULATOR termina (Fase 10)

  // ─── Manutenção ──────────────────────────────────────────────────────────
  { source: "CLEANUP", cron: "0 2 * * 0", phase: "maintenance" },

  // ─── Internacional (TikTok Creative Center — LATAM/Ásia/Europa) ───────────
  // Fase própria (não "global"/"brazil") de propósito: não entram na barreira
  // do ciclo diário (CYCLE_SCRAPER_SOURCES) — alimentam latamScore/asiaScore/
  // europeScore como dado suplementar, sem atrasar o SCORE_CALCULATOR do dia.
  { source: "TIKTOK_CREATIVE_MX", cron: "0 3 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_CO", cron: "5 3 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_AR", cron: "10 3 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_CL", cron: "15 3 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_TH", cron: "0 8 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_ID", cron: "10 8 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_VN", cron: "20 8 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_JP", cron: "30 8 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_FR", cron: "0 14 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_DE", cron: "10 14 * * *", phase: "international" },
  { source: "TIKTOK_CREATIVE_IT", cron: "20 14 * * *", phase: "international" },
  // Chamada de API leve (sem Puppeteer) — cobre as 11 regiões em uma execução,
  // mesmo padrão do GOOGLE_TRENDS_US (que já cobre US/UK/AU/CA numa só fonte).
  { source: "GOOGLE_TRENDS_INTERNATIONAL", cron: "0 15 * * *", phase: "international" },
  // A cada 2h — cron de passo (*/2), por isso fica fora da fase "processing"
  // (earliestHourInPhase/latestHourInPhase só extraem hora fixa, não suportam
  // step syntax; "international" não é comparado por elas hoje).
  { source: "EXPLOSIVE_DETECTOR", cron: "0 */2 * * *", phase: "international" },
];

export const TIMEZONE = "America/Sao_Paulo";

/** Fontes que fazem parte da "barreira" do ciclo diário — o score só libera quando todas terminarem. */
export const CYCLE_SCRAPER_SOURCES = SCHEDULES.filter((e) => e.phase === "global" || e.phase === "brazil").map(
  (e) => e.source
);

function cronHour(cron: string): number {
  const parts = cron.split(" ");
  return Number(parts[1]);
}

/** Retorna a hora do primeiro job da fase (usado para validar a ordem global < brasil). */
export function earliestHourInPhase(phase: CyclePhase): number {
  const hours = SCHEDULES.filter((e) => e.phase === phase && e.cron !== "triggered").map((e) =>
    cronHour(e.cron)
  );
  return Math.min(...hours);
}

export function latestHourInPhase(phase: CyclePhase): number {
  const hours = SCHEDULES.filter((e) => e.phase === phase && e.cron !== "triggered").map((e) =>
    cronHour(e.cron)
  );
  return Math.max(...hours);
}
