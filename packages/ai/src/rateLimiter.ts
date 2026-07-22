const WINDOW_MS = 60_000;

/**
 * Limitador de janela deslizante: no máximo `maxPerMinute` chamadas em
 * qualquer intervalo de 60s. Quando o limite é atingido, `waitForSlot`
 * aguarda em vez de lançar erro — condiz com "fila cheia espera, não quebra".
 */
export class SlidingWindowRateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly maxPerMinute: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms))
  ) {}

  async waitForSlot(): Promise<void> {
    for (;;) {
      const currentTime = this.now();
      this.timestamps = this.timestamps.filter((t) => currentTime - t < WINDOW_MS);

      if (this.timestamps.length < this.maxPerMinute) {
        this.timestamps.push(currentTime);
        return;
      }

      const oldest = this.timestamps[0]!;
      const waitMs = WINDOW_MS - (currentTime - oldest) + 25;
      await this.sleep(waitMs);
    }
  }
}
