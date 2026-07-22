function scoreColor(score: number): { bar: string; text: string } {
  if (score >= 65) return { bar: "bg-emerald-500", text: "text-emerald-400" };
  if (score >= 50) return { bar: "bg-yellow-500", text: "text-yellow-400" };
  return { bar: "bg-red-500", text: "text-red-400" };
}

export function ScoreBar({ score, className = "" }: { score: number; className?: string }) {
  const { bar, text } = scoreColor(score);
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className={`flex items-center gap-2 ${className}`} role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`font-mono text-sm font-semibold tabular-nums ${text}`}>{Math.round(score)}</span>
    </div>
  );
}
