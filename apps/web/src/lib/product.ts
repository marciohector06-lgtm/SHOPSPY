import type { ProductDetail, TrendScoreEntry } from "./types";

/** `scores` vem em ordem cronológica ascendente (API já reverte) — o mais recente é o último. */
export function latestScore(product: ProductDetail): TrendScoreEntry | null {
  return product.scores.length > 0 ? product.scores[product.scores.length - 1]! : null;
}
