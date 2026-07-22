/**
 * Limitador simples baseado em atraso mínimo entre requests, por fonte.
 * Cada scraper tem sua própria instância para não competir por budget com os outros.
 */
export class RateLimiter {
  private lastRequestAt = 0;

  constructor(private readonly minDelayMs: number) {}

  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    const remaining = this.minDelayMs - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    this.lastRequestAt = Date.now();
  }
}

// Delays mínimos por fonte (ms). Todos mais conservadores que o crawl-delay
// publicado no robots.txt de cada site (ex.: Shopee pede 1s, usamos 3s).
export const SOURCE_MIN_DELAY_MS = {
  SHOPEE_BR: 3000,
  MERCADOLIVRE_BR: 1000,
  TIKTOK_SHOP_BR: 4000,
  GOOGLE_TRENDS_BR: 3000,
} as const;
