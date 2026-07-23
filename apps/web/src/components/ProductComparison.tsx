import type { ProductDetail } from "../lib/types";
import { formatBRL, formatCompactNumber, formatPercent } from "../lib/format";
import { EmptyState } from "./ui/EmptyState";
import { ClockIcon } from "./icons";

interface Row {
  label: string;
  value: string | null;
}

function BRRows(product: ProductDetail): Row[] {
  return [
    { label: "Preço", value: product.priceBR !== null ? formatBRL(product.priceBR) : null },
    { label: "Comissão", value: product.commissionValueBR !== null ? formatBRL(product.commissionValueBR) : null },
    { label: "Avaliação", value: product.ratingBR !== null ? `${product.ratingBR.toFixed(1)}★` : null },
    { label: "Vendidos", value: product.soldCountBR !== null ? formatCompactNumber(product.soldCountBR) : null },
    { label: "Buscas / semana", value: product.searchesBR !== null ? formatCompactNumber(product.searchesBR) : null },
  ].filter((row) => row.value !== null);
}

function GlobalRows(product: ProductDetail): Row[] {
  return [
    { label: "Preço (US)", value: product.priceUS !== null ? `US$ ${product.priceUS.toFixed(2)}` : null },
    { label: "Vendidos (US)", value: product.soldCountUS !== null ? formatCompactNumber(product.soldCountUS) : null },
    { label: "Rank Amazon US", value: product.amazonRankUS !== null ? `#${product.amazonRankUS}` : null },
    { label: "Rank Amazon UK", value: product.amazonRankUK !== null ? `#${product.amazonRankUK}` : null },
    { label: "Impressões TikTok", value: product.tiktokImpressions !== null ? formatCompactNumber(product.tiktokImpressions) : null },
    { label: "CTR TikTok", value: product.tiktokCTR !== null ? formatPercent(product.tiktokCTR, 1) : null },
  ].filter((row) => row.value !== null);
}

function ComparisonBlock({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-spy-border bg-spy-card p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-spy-muted">{title}</h3>
      {rows.length === 0 ? (
        <EmptyState
          icon={<ClockIcon className="h-6 w-6" />}
          title={`Dados ${title} ainda não coletados`}
          message="Aparecem aqui assim que a coleta encontrar esse dado."
        />
      ) : (
        rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-spy-border/60 py-2 text-sm last:border-0">
            <span className="text-spy-muted">{row.label}</span>
            <span className="font-data text-spy-text">{row.value}</span>
          </div>
        ))
      )}
    </div>
  );
}

/** Só mostra linhas com dado real — nunca um traço "—" pra campo null (pedido explícito da Fase 6). */
export function ProductComparison({ product }: { product: ProductDetail }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ComparisonBlock title="Brasil" rows={BRRows(product)} />
      <ComparisonBlock title="Global" rows={GlobalRows(product)} />
    </div>
  );
}
