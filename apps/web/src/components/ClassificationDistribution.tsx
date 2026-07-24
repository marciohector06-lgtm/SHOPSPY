import type { ScoreClass } from "@shopspy/shared";
import { SCORE_CLASSES } from "@shopspy/shared";
import { CLASSIFICATION_LABELS } from "./OpportunityBadge";

const BAR_COLOR: Record<ScoreClass, string> = {
  MAXIMUM: "bg-spy-max",
  HIGH: "bg-spy-high",
  MEDIUM: "bg-spy-medium",
  SATURATING: "bg-spy-sat",
  AVOID: "bg-spy-avoid",
};

/** Barras horizontais simples (sem Recharts) — quantos produtos em cada classificação, mesma cor do OpportunityBadge. */
export function ClassificationDistribution({ counts }: { counts: Record<ScoreClass, number> }) {
  const max = Math.max(...SCORE_CLASSES.map((c) => counts[c]), 1);

  return (
    <div className="flex flex-col gap-3">
      {SCORE_CLASSES.map((classification) => {
        const value = counts[classification];
        const pct = (value / max) * 100;
        return (
          <div key={classification} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-spy-muted">{CLASSIFICATION_LABELS[classification]}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-spy-surface">
              <div className={`h-full rounded-full ${BAR_COLOR[classification]}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right font-data text-xs font-semibold tabular-nums text-spy-text">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
