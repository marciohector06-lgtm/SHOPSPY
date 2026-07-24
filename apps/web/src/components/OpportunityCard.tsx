import Link from "next/link";
import type { ProductDetail } from "../lib/types";
import { latestScore } from "../lib/product";
import { formatBRL, formatCategory } from "../lib/format";
import { ProductImage } from "./ProductImage";
import { ScoreBar } from "./ScoreBar";
import { OpportunityBadge } from "./OpportunityBadge";
import { GapIndicator } from "./GapIndicator";
import { WindowBadge } from "./WindowBadge";
import { BoltIcon } from "./icons";

const NEW_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_MS;
}

export function OpportunityCard({ product, onOpenScript }: { product: ProductDetail; onOpenScript: () => void }) {
  const score = latestScore(product);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-spy-border bg-spy-card p-4 sm:flex-row sm:items-center sm:gap-6">
      {/* Bloco 1 — Produto (40%) */}
      <div className="flex items-center gap-3 sm:w-2/5">
        <ProductImage src={product.imageUrl} name={product.name} size={80} className="shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            {isNew(product.createdAt) && (
              <span className="rounded-full bg-spy-max/20 px-2 py-0.5 text-[10px] font-bold text-spy-max">NOVO</span>
            )}
          </div>
          <span className="line-clamp-2 text-sm font-medium text-spy-text">{product.name}</span>
          <span className="text-xs text-spy-muted">{formatCategory(product.category)}</span>
        </div>
      </div>

      {/* Bloco 2 — Inteligência ShopSpy (40%) */}
      <div className="flex flex-col gap-3 sm:w-2/5">
        {score && <ScoreBar score={score.scoreTotal} size="lg" />}
        <GapIndicator globalScore={score?.trendsUS ?? 0} brScore={score?.trendsBR ?? null} />
        <div className="flex items-center gap-2">
          {score && <OpportunityBadge classification={score.classification} />}
          <WindowBadge label={score?.windowLabel ?? null} />
        </div>
      </div>

      {/* Bloco 3 — Ação (20%) */}
      <div className="flex flex-col items-start gap-2 sm:w-1/5 sm:items-end">
        <div className="text-right">
          <span className="block text-[10px] uppercase tracking-wide text-spy-faint">Comissão</span>
          <span className="text-lg font-bold text-spy-high">{formatBRL(product.commissionValueBR)}</span>
        </div>
        <Link
          href={`/produto/${product.id}`}
          className="flex h-11 w-full items-center justify-center rounded-md bg-spy-indigo px-3 text-center text-xs font-medium text-white transition-colors hover:bg-spy-indigo-light sm:w-auto"
        >
          Ver produto
        </Link>
        <button
          type="button"
          onClick={onOpenScript}
          className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-md border border-spy-border px-3 text-xs font-medium text-spy-text transition-colors hover:border-spy-indigo/40 hover:text-spy-indigo-light sm:w-auto"
        >
          <BoltIcon className="h-3.5 w-3.5" />
          Roteiro UGC
        </button>
      </div>
    </div>
  );
}
