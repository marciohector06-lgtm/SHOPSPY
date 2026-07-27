"use client";

import { useState } from "react";
import type { ProductDetail, TrendScoreEntry } from "../lib/types";
import { formatBRL } from "../lib/format";
import { ScoreBar } from "./ScoreBar";
import { OpportunityBadge } from "./OpportunityBadge";
import { WindowBadge } from "./WindowBadge";
import { GapIndicator } from "./GapIndicator";
import { UGCScriptModal } from "./UGCScriptModal";
import { CreateAlertModal } from "./CreateAlertModal";
import { BoltIcon, BellIcon } from "./icons";

/** Coluna direita fixa (sticky) — pedido explícito: top 72px, self-start no grid pai. */
export function ProductActionCard({ product, score }: { product: ProductDetail; score: TrendScoreEntry | null }) {
  const [scriptOpen, setScriptOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-spy-border bg-spy-card p-4 lg:sticky lg:top-[72px] lg:self-start">
      {score ? (
        <>
          <ScoreBar score={score.scoreTotal} size="lg" />
          <div className="flex flex-wrap items-center gap-2">
            <OpportunityBadge classification={score.classification} />
            <WindowBadge label={score.windowLabel} />
          </div>
          <GapIndicator globalScore={score.trendsUS} brScore={score.trendsBR} />
        </>
      ) : (
        <p className="text-sm text-spy-muted">Ainda sem score calculado pra esse produto.</p>
      )}

      <div className="border-t border-spy-border pt-4">
        <span className="block text-[10px] uppercase tracking-wide text-spy-faint">Comissão</span>
        <span className="text-2xl font-bold text-spy-high">{formatBRL(product.commissionValueBR)}</span>
      </div>

      <button
        type="button"
        onClick={() => setScriptOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-spy-indigo px-4 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light"
      >
        <BoltIcon className="h-4 w-4" />
        Gerar Roteiro UGC
      </button>

      <button
        type="button"
        onClick={() => setAlertOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-spy-border text-sm font-medium text-spy-text transition-colors hover:border-spy-indigo/40 hover:text-spy-indigo-light"
      >
        <BellIcon className="h-4 w-4" />
        Criar alerta
      </button>

      <UGCScriptModal
        productId={product.id}
        productName={product.name}
        isOpen={scriptOpen}
        onClose={() => setScriptOpen(false)}
      />
      <CreateAlertModal
        productId={product.id}
        productName={product.name}
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}
