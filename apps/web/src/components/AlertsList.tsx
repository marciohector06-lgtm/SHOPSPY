"use client";

import { useState } from "react";
import Link from "next/link";
import type { Alert } from "../lib/types";
import { deleteAlert, toggleAlert } from "../lib/api";
import { formatCategory } from "../lib/format";
import { ProductImage } from "./ProductImage";
import { ScoreBar } from "./ScoreBar";

export function AlertsList({ initialItems }: { initialItems: Alert[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleToggle(alert: Alert) {
    setPendingId(alert.id);
    try {
      const updated = await toggleAlert(alert.id);
      setItems((prev) => prev.map((a) => (a.id === alert.id ? { ...a, active: updated.active } : a)));
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(alert: Alert) {
    setPendingId(alert.id);
    try {
      await deleteAlert(alert.id);
      setItems((prev) => prev.filter((a) => a.id !== alert.id));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((alert) => {
        const score = alert.product.scores[0]?.scoreTotal ?? null;
        const busy = pendingId === alert.id;

        return (
          <div
            key={alert.id}
            className="flex flex-col gap-3 rounded-xl border border-spy-border bg-spy-card p-4 sm:flex-row sm:items-center sm:gap-4"
          >
            <Link href={`/produto/${alert.product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <ProductImage src={alert.product.imageUrl} name={alert.product.name} size={56} className="shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="line-clamp-1 text-sm font-medium text-spy-text">{alert.product.name}</span>
                <span className="text-xs text-spy-muted">{formatCategory(alert.product.category)}</span>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-4 text-xs text-spy-muted sm:gap-6">
              <div className="flex flex-col gap-1">
                <span className="uppercase tracking-wide text-spy-faint">Score atual</span>
                {score !== null ? <ScoreBar score={score} size="sm" /> : <span>—</span>}
              </div>
              <div className="flex flex-col gap-1">
                <span className="uppercase tracking-wide text-spy-faint">Threshold</span>
                <span className="text-spy-text">{alert.threshold}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="uppercase tracking-wide text-spy-faint">Canal</span>
                <span className="text-spy-text">E-mail</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggle(alert)}
                disabled={busy}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-50 ${
                  alert.active ? "bg-spy-high/15 text-spy-high ring-spy-high/30" : "bg-spy-avoid/15 text-spy-muted ring-spy-avoid/30"
                }`}
              >
                {alert.active ? "Ativo" : "Inativo"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(alert)}
                disabled={busy}
                className="rounded-md border border-spy-border px-2.5 py-1 text-xs font-medium text-spy-muted transition-colors hover:border-spy-max/40 hover:text-spy-max disabled:opacity-50"
              >
                Remover
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
