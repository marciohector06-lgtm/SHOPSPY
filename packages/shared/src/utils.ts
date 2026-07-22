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
