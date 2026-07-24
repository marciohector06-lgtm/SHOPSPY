import Link from "next/link";
import type { ProductDetail } from "../lib/types";
import { latestScore } from "../lib/product";
import { formatBRL, formatCategory } from "../lib/format";
import { ProductImage } from "./ProductImage";
import { ScoreBar } from "./ScoreBar";
import { OpportunityBadge } from "./OpportunityBadge";
import { GapIndicator } from "./GapIndicator";
import { WindowBadge } from "./WindowBadge";

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-spy-surface p-2.5">
      <span className="text-[10px] uppercase tracking-wide text-spy-faint">{label}</span>
      {children}
    </div>
  );
}

export function ProductCard({ product }: { product: ProductDetail }) {
  const score = latestScore(product);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-spy-border bg-spy-card p-4">
      <div className="flex items-start gap-3">
        <ProductImage src={product.imageUrl} name={product.name} size={64} className="shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-sm font-medium text-spy-text">{product.name}</span>
          <span className="text-xs text-spy-muted">{formatCategory(product.category)}</span>
        </div>
        {score && <OpportunityBadge classification={score.classification} />}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Score">{score ? <ScoreBar score={score.scoreTotal} size="md" /> : <span className="text-xs text-spy-muted">—</span>}</Metric>
        <Metric label="Gap BR × Global">
          <GapIndicator globalScore={score?.trendsUS ?? 0} brScore={score?.trendsBR ?? null} />
        </Metric>
        <Metric label="Janela">
          <WindowBadge label={score?.windowLabel ?? null} />
        </Metric>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-spy-muted">Comissão {formatBRL(product.commissionValueBR)}</span>
        <Link
          href={`/produto/${product.id}`}
          className="inline-flex h-11 items-center rounded-md border border-spy-border px-3 text-xs font-medium text-spy-text transition-colors hover:border-spy-indigo/40 hover:text-spy-indigo-light"
        >
          Ver produto →
        </Link>
      </div>
    </div>
  );
}
