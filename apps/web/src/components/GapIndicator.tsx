function gapColor(gap: number): string {
  if (gap > 40) return "text-emerald-400";
  if (gap > 20) return "text-yellow-400";
  return "text-zinc-500";
}

/** gap > 40 = oportunidade máxima | gap > 20 = alta | <= 10 = chegou tarde (packages/database/prisma/schema.prisma). */
export function GapIndicator({ globalScore, brScore }: { globalScore: number; brScore: number }) {
  const gap = globalScore - brScore;
  const total = Math.max(globalScore, brScore, 1);
  const globalPct = (globalScore / total) * 100;
  const brPct = (brScore / total) * 100;

  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="relative h-1.5 rounded-full bg-zinc-800">
        <div className="absolute h-1.5 rounded-full bg-indigo-500/70" style={{ width: `${globalPct}%` }} />
        <div className="absolute h-1.5 rounded-full bg-zinc-500" style={{ width: `${brPct}%` }} />
      </div>
      <span className={`font-mono text-xs font-semibold tabular-nums ${gapColor(gap)}`}>
        {gap > 0 ? "+" : ""}
        {Math.round(gap)} gap
      </span>
    </div>
  );
}
