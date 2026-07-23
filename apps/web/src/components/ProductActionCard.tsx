"use client";

import { useState } from "react";
import type { ProductDetail, TrendScoreEntry } from "../lib/types";
import { formatBRL } from "../lib/format";
import { ScoreBar } from "./ScoreBar";
import { OpportunityBadge } from "./OpportunityBadge";
import { WindowBadge } from "./WindowBadge";
import { GapIndicator } from "./GapIndicator";
import { UGCScriptModal } from "./UGCScriptModal";
import { BoltIcon } from "./icons";

/** Coluna direita fixa (sticky) — pedido explícito: top 72px, self-start no grid pai. */
export function ProductActionCard({ product, score }: { product: ProductDetail; score: TrendScoreEntry | null }) {
  const [scriptOpen, setScriptOpen] = useState(false);

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
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-spy-indigo px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light"
      >
        <BoltIcon className="h-4 w-4" />
        Gerar Roteiro UGC
      </button>

      <UGCScriptModal
        productId={product.id}
        productName={product.name}
        isOpen={scriptOpen}
        onClose={() => setScriptOpen(false)}
      />
    </div>
  );
}
