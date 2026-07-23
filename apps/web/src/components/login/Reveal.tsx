"use client";

import { useEffect, useState, type ReactNode } from "react";

const HIDDEN_OFFSET: Record<"up" | "right", string> = {
  up: "translate-y-4",
  right: "translate-x-6",
};

/**
 * Anima a entrada via transição de classes (não @keyframes) — o ambiente de
 * screenshot usado para validar esta página mostrou um bug de raster do
 * Chromium (software rendering) em que elementos grandes animados via
 * `animation-fill-mode: both` ficam com o cálculo de estilo correto mas não
 * são pintados. Transições disparadas por toggle de estado não têm o mesmo
 * ciclo de vida de "animation object" e não reproduziram o bug.
 */
export function Reveal({
  children,
  delayMs = 0,
  from = "up",
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  from?: "up" | "right";
  className?: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        shown ? "translate-x-0 translate-y-0 opacity-100" : `opacity-0 ${HIDDEN_OFFSET[from]}`
      } ${className}`}
    >
      {children}
    </div>
  );
}
