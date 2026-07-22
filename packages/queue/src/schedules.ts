export type CyclePhase = "global" | "brazil" | "processing" | "maintenance";

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
  { source: "ALERT_CHECKER", cron: "triggered", phase: "processing" }, // liberado quando SCORE_CALCULATOR termina (Fase 10)

  // ─── Manutenção ──────────────────────────────────────────────────────────
  { source: "CLEANUP", cron: "0 2 * * 0", phase: "maintenance" },
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
