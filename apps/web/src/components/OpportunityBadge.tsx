import { CLASSIFICATION_EMOJI, type ScoreClass } from "@shopspy/shared";

const LABELS: Record<ScoreClass, string> = {
  MAXIMUM: "Máxima",
  HIGH: "Alta",
  MEDIUM: "Média",
  SATURATING: "Saturando",
  AVOID: "Evitar",
};

const COLORS: Record<ScoreClass, string> = {
  MAXIMUM: "bg-red-500/15 text-red-300 ring-red-500/30",
  HIGH: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30",
  SATURATING: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  AVOID: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
};

export function OpportunityBadge({ classification }: { classification: ScoreClass }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${COLORS[classification]}`}
    >
      <span aria-hidden>{CLASSIFICATION_EMOJI[classification]}</span>
      {LABELS[classification]}
    </span>
  );
}
