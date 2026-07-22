/**
 * Normaliza o nome de um produto para deduplicação entre fontes
 * (Shopee, TikTok Shop, Mercado Livre, Amazon...).
 * Usado para popular Product.nameNormalized.
 */
export function normalizeProductName(name: string): string {
  return name
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // remove marcas diacriticas (acentos)
    .replace(/\p{Extended_Pictographic}/gu, "") // remove emojis
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // remove pontuacao/simbolos
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Semana ISO-8601 (segunda a domingo) — mesma convenção do índice
 * TrendScore.@@index([weekNumber, year]). Usada pela API (dashboard,
 * opportunities) e pelo worker de alertas pra saber "essa semana".
 */
export function isoWeek(date: Date): { weekNumber: number; year: number } {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return { weekNumber, year: target.getUTCFullYear() };
}
