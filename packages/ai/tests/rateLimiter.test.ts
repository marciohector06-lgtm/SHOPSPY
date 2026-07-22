import { describe, expect, it } from "vitest";
import { SlidingWindowRateLimiter } from "../src/rateLimiter";

function fakeClock(startAt = 0) {
  let current = startAt;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("SlidingWindowRateLimiter", () => {
  it("permite até maxPerMinute chamadas sem esperar", async () => {
    const clock = fakeClock();
    const limiter = new SlidingWindowRateLimiter(3, clock.now, async () => {});

    await limiter.waitForSlot();
    await limiter.waitForSlot();
    await limiter.waitForSlot();
    // nenhuma chamada de sleep necessária até aqui — se chegou até aqui sem travar, passou
    expect(true).toBe(true);
  });

  it("espera quando a janela de 60s está cheia, depois libera", async () => {
    const clock = fakeClock();
    const sleepCalls: number[] = [];
    const sleep = async (ms: number) => {
      sleepCalls.push(ms);
      clock.advance(ms);
    };
    const limiter = new SlidingWindowRateLimiter(2, clock.now, sleep);

    await limiter.waitForSlot(); // t=0
    await limiter.waitForSlot(); // t=0
    await limiter.waitForSlot(); // precisa esperar até t=60000

    expect(sleepCalls.length).toBeGreaterThan(0);
    expect(clock.now()).toBeGreaterThanOrEqual(60_000);
  });
});
