/** Semana ISO-8601 (segunda a domingo) — mesma convenção do índice TrendScore.@@index([weekNumber, year]). */
export function isoWeek(date: Date): { weekNumber: number; year: number } {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return { weekNumber, year: target.getUTCFullYear() };
}
