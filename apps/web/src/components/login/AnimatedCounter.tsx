"use client";

import { useEffect, useRef, useState } from "react";

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function AnimatedCounter({
  value,
  durationMs = 1500,
  delayMs = 0,
}: {
  value: number;
  durationMs?: number;
  delayMs?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const start = performance.now() + delayMs;

    function tick(now: number) {
      const elapsed = now - start;
      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / durationMs, 1);
      setDisplay(Math.round(easeOutQuad(progress) * value));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs, delayMs]);

  return <span className="tabular-nums">{display}</span>;
}
