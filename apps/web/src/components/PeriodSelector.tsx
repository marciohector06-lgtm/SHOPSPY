"use client";

import { useState } from "react";
import { PERIODS, PERIOD_LABELS, usePeriod } from "../lib/PeriodContext";

/** Dropdown global (afeta todas as seções que leem usePeriod()) — não é um filtro local de página. */
export function PeriodSelector() {
  const { period, setPeriod } = usePeriod();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="flex items-center gap-1.5 rounded-md border border-spy-border bg-spy-surface px-3 py-1.5 text-xs text-spy-text transition-colors hover:border-spy-border-active"
      >
        {PERIOD_LABELS[period]}
        <span className="text-spy-muted">▾</span>
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border border-spy-border bg-spy-card shadow-lg">
          {PERIODS.map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => {
                  setPeriod(p);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-spy-hover ${
                  p === period ? "text-spy-indigo-light" : "text-spy-text"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
