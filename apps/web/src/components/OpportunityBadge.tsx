import type { ScoreClass } from "@shopspy/shared";

export const CLASSIFICATION_LABELS: Record<ScoreClass, string> = {
  MAXIMUM: "Máxima",
  HIGH: "Alta",
  MEDIUM: "Média",
  SATURATING: "Saturando",
  AVOID: "Evitar",
};

export const CLASSIFICATION_COLORS: Record<ScoreClass, string> = {
  MAXIMUM: "bg-spy-max/15 text-spy-max ring-spy-max/30",
  HIGH: "bg-spy-high/15 text-spy-high ring-spy-high/30",
  MEDIUM: "bg-spy-medium/15 text-spy-medium ring-spy-medium/30",
  SATURATING: "bg-spy-sat/15 text-spy-sat ring-spy-sat/30",
  AVOID: "bg-spy-avoid/15 text-spy-muted ring-spy-avoid/30",
};

export function OpportunityBadge({ classification }: { classification: ScoreClass }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CLASSIFICATION_COLORS[classification]}`}
    >
      {CLASSIFICATION_LABELS[classification]}
    </span>
  );
}
