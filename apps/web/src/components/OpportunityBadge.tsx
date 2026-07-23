import type { ScoreClass } from "@shopspy/shared";

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

const DOT_COLORS: Record<ScoreClass, string> = {
  MAXIMUM: "bg-red-400",
  HIGH: "bg-emerald-400",
  MEDIUM: "bg-yellow-400",
  SATURATING: "bg-orange-400",
  AVOID: "bg-zinc-400",
};

export function OpportunityBadge({ classification }: { classification: ScoreClass }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${COLORS[classification]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[classification]}`} aria-hidden />
      {LABELS[classification]}
    </span>
  );
}
