import { formatBRL } from "../lib/format";

interface BRAvailabilityBadgeProps {
  priceBR: number | null;
  commissionValueBR: number | null;
}

/** Sinaliza se o matching BR↔Global (packages/scrapers/src/brazil/br-product-matcher.ts) já achou um equivalente. */
export function BRAvailabilityBadge({ priceBR, commissionValueBR }: BRAvailabilityBadgeProps) {
  if (priceBR && commissionValueBR) {
    return (
      <span className="inline-flex items-center rounded-full bg-spy-high/15 px-2.5 py-0.5 font-data text-xs font-medium text-spy-high ring-1 ring-inset ring-spy-high/30">
        Disponível BR • {formatBRL(commissionValueBR)} comissão
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-spy-surface px-2.5 py-0.5 font-data text-xs font-medium text-spy-faint ring-1 ring-inset ring-spy-border">
      Verificando BR...
    </span>
  );
}
