import Link from "next/link";
import type { ProductDetail } from "../lib/types";
import { latestScore } from "../lib/product";
import { formatBRL, formatCategory } from "../lib/format";
import { ProductImage } from "./ProductImage";
import { ScoreBar } from "./ScoreBar";
import { OpportunityBadge } from "./OpportunityBadge";
import { WindowBadge } from "./WindowBadge";
import { BoltIcon } from "./icons";

export function OpportunityBanner({ product }: { product: ProductDetail }) {
  const score = latestScore(product);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-spy-indigo/30 bg-gradient-to-br from-spy-indigo-dim to-spy-card p-5 sm:flex-row sm:items-center">
      <ProductImage src={product.imageUrl} name={product.name} size={88} className="shrink-0 rounded-xl" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-spy-indigo-light">
          <BoltIcon className="h-3.5 w-3.5" /> Oportunidade da semana
        </span>
        <span className="truncate text-lg font-semibold text-spy-text">{product.name}</span>
        <div className="flex flex-wrap items-center gap-2 text-sm text-spy-muted">
          <span>{formatCategory(product.category)}</span>
          {product.commissionValueBR !== null && <span>• Comissão {formatBRL(product.commissionValueBR)}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {score && <OpportunityBadge classification={score.classification} />}
          <WindowBadge label={score?.windowLabel ?? null} />
        </div>
      </div>

      {score && (
        <div className="shrink-0 sm:pl-4">
          <ScoreBar score={score.scoreTotal} size="lg" />
        </div>
      )}

      <Link
        href={`/produto/${product.id}`}
        className="flex h-11 shrink-0 items-center self-start rounded-md bg-spy-indigo px-4 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light sm:self-center"
      >
        Ver detalhes →
      </Link>
    </div>
  );
}
