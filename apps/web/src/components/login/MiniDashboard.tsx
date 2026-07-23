import { ScoreBar } from "../ScoreBar";
import { OpportunityBadge } from "../OpportunityBadge";

const PREVIEW_PRODUCTS = [
  { name: "Kit Calça Wide Leg", score: 87, classification: "MAXIMUM" as const, commission: "R$ 22,49" },
  { name: "Sérum Facial Vitamina C", score: 65, classification: "MEDIUM" as const, commission: "R$ 15,30" },
  { name: "Fone Bluetooth Gamer", score: 91, classification: "HIGH" as const, commission: "R$ 31,00" },
];

export function MiniDashboard() {
  return (
    <div className="w-full max-w-[480px]">
      <p className="mb-2 font-data text-[11px] uppercase tracking-wider text-ink-muted">
        Oportunidades desta semana
      </p>
      <div className="rounded-2xl border border-brand-border bg-brand-card p-4 shadow-[0_0_40px_rgba(99,102,241,0.06)]">
        <ul className="flex flex-col gap-3">
          {PREVIEW_PRODUCTS.map((product) => (
            <li
              key={product.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-brand-border/60 bg-brand-surface/60 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-primary">{product.name}</p>
                <div className="mt-1">
                  <ScoreBar score={product.score} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <OpportunityBadge classification={product.classification} />
                <span className="font-data text-xs text-brand-success">{product.commission}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
