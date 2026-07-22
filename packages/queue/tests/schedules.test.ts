import { describe, expect, it } from "vitest";
import {
  SCHEDULES,
  CYCLE_SCRAPER_SOURCES,
  earliestHourInPhase,
  latestHourInPhase,
} from "../src/schedules";

describe("SCHEDULES — ordem crítica global antes de brasil", () => {
  it("todo job da fase global termina antes do primeiro job da fase brasil começar", () => {
    expect(latestHourInPhase("global")).toBeLessThan(earliestHourInPhase("brazil"));
  });

  it("todo job da fase brasil termina antes do score-calculator (processamento) rodar", () => {
    // SCORE_CALCULATOR é 'triggered' (liberado pela barreira), os demais de
    // processamento têm cron — nenhum deve rodar antes do fim do ciclo BR.
    expect(latestHourInPhase("brazil")).toBeLessThan(earliestHourInPhase("processing"));
  });

  it("cada source aparece só uma vez no schedule", () => {
    const sources = SCHEDULES.map((e) => e.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it("CYCLE_SCRAPER_SOURCES inclui todos os scrapers global+brasil e nada de processamento/manutenção", () => {
    expect(CYCLE_SCRAPER_SOURCES).toContain("SHOPEE_BR");
    expect(CYCLE_SCRAPER_SOURCES).toContain("ALIEXPRESS_GLOBAL");
    expect(CYCLE_SCRAPER_SOURCES).not.toContain("SCORE_CALCULATOR");
    expect(CYCLE_SCRAPER_SOURCES).not.toContain("CLEANUP");
    expect(CYCLE_SCRAPER_SOURCES.length).toBe(10);
  });
});
