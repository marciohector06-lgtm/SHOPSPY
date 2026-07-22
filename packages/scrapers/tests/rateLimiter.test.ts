import { describe, expect, it } from "vitest";
import { RateLimiter } from "../src/shared/rateLimiter";

describe("RateLimiter", () => {
  it("não atrasa a primeira chamada", async () => {
    const limiter = new RateLimiter(200);
    const start = Date.now();
    await limiter.wait();
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("impõe o atraso mínimo entre chamadas consecutivas", async () => {
    const limiter = new RateLimiter(150);
    await limiter.wait();
    const start = Date.now();
    await limiter.wait();
    expect(Date.now() - start).toBeGreaterThanOrEqual(140);
  });
});
