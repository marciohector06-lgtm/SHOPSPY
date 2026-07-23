import { ClockIcon } from "./icons";

function gapColor(gap: number): string {
  if (gap > 40) return "text-spy-high";
  if (gap > 20) return "text-spy-medium";
  return "text-spy-muted";
}

interface GapIndicatorProps {
  globalScore: number;
  /** null (sem coleta ainda) ou 0 (mesma coisa, hoje) mostram o estado "em coleta" em vez de uma barra zerada — não é dado real ainda. */
  brScore: number | null;
}

/** gap > 40 = oportunidade máxima | gap > 20 = alta | <= 10 = chegou tarde (packages/database/prisma/schema.prisma). */
export function GapIndicator({ globalScore, brScore }: GapIndicatorProps) {
  if (!brScore) {
    return (
      <div className="flex w-28 items-center gap-1.5 text-xs text-spy-muted">
        <ClockIcon className="h-3.5 w-3.5 shrink-0" />
        Dados BR em coleta...
      </div>
    );
  }

  const gap = globalScore - brScore;
  const total = Math.max(globalScore, brScore, 1);
  const globalPct = (globalScore / total) * 100;
  const brPct = (brScore / total) * 100;

  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="relative h-1.5 rounded-full bg-spy-surface">
        <div className="absolute h-1.5 rounded-full bg-spy-indigo/70" style={{ width: `${globalPct}%` }} />
        <div className="absolute h-1.5 rounded-full bg-spy-faint" style={{ width: `${brPct}%` }} />
      </div>
      <span className={`font-data text-xs font-semibold tabular-nums ${gapColor(gap)}`}>
        {gap > 0 ? "+" : ""}
        {Math.round(gap)} gap
      </span>
    </div>
  );
}
