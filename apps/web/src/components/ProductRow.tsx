import Link from "next/link";
import type { ProductDetail } from "../lib/types";
import { latestScore } from "../lib/product";
import { formatBRL, formatCategory, formatCompactNumber } from "../lib/format";
import { ProductImage } from "./ProductImage";
import { RankBadge } from "./RankBadge";
import { ScoreBar } from "./ScoreBar";
import { OpportunityBadge } from "./OpportunityBadge";
import { WindowBadge } from "./WindowBadge";

export function ProductRow({ product, rank }: { product: ProductDetail; rank: number }) {
  const score = latestScore(product);

  return (
    <div className="flex items-center gap-3 border-b border-spy-border px-4 py-3 last:border-b-0">
      <RankBadge position={rank} />
      <ProductImage src={product.imageUrl} name={product.name} size={48} className="shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-spy-text">{product.name}</span>
        <span className="text-xs text-spy-muted">{formatCategory(product.category)}</span>
      </div>
      {score && <ScoreBar score={score.scoreTotal} size="sm" className="hidden shrink-0 sm:block" />}
      <span className="hidden w-16 shrink-0 text-right text-xs text-spy-muted md:block">
        {formatBRL(product.commissionValueBR)}
      </span>
      <span className="hidden w-14 shrink-0 text-right text-xs text-spy-muted md:block">
        {formatCompactNumber(product.soldCountBR)}
      </span>
      {score && (
        <div className="hidden shrink-0 sm:block">
          <OpportunityBadge classification={score.classification} />
        </div>
      )}
      <div className="hidden shrink-0 md:block">
        <WindowBadge label={score?.windowLabel ?? null} />
      </div>
      <Link
        href={`/produto/${product.id}`}
        className="shrink-0 rounded-md border border-spy-border px-3 py-1.5 text-xs font-medium text-spy-text transition-colors hover:border-spy-indigo/40 hover:text-spy-indigo-light"
      >
        Ver
      </Link>
    </div>
  );
}
