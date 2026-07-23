export type ScoreBarSize = "sm" | "md" | "lg";

interface ScoreBarProps {
  score: number;
  size?: ScoreBarSize;
  /** Só afeta o `lg` — os outros tamanhos seguem a regra fixa do design (sm nunca mostra número, md sempre mostra). */
  showLabel?: boolean;
  className?: string;
}

// Faixas de cor por valor (não por classificação de negócio — essa é a do
// OpportunityBadge/TrendScore.classification, um sinal diferente e mais
// nuançado). 0-49 cinza, 50-64 âmbar, 65-79 verde, 80+ rosa.
function scoreColor(score: number): { bar: string; text: string } {
  if (score >= 80) return { bar: "bg-spy-max", text: "text-spy-max" };
  if (score >= 65) return { bar: "bg-spy-high", text: "text-spy-high" };
  if (score >= 50) return { bar: "bg-spy-medium", text: "text-spy-medium" };
  return { bar: "bg-spy-avoid", text: "text-spy-avoid" };
}

function tierLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 65) return "Alto";
  if (score >= 50) return "Médio";
  return "Baixo";
}

const BAR_HEIGHT: Record<ScoreBarSize, string> = { sm: "h-1", md: "h-2", lg: "h-3" };
const BAR_WIDTH: Record<ScoreBarSize, string> = { sm: "w-12", md: "w-24", lg: "w-full" };
const NUMBER_SIZE: Record<ScoreBarSize, string> = { sm: "", md: "text-sm", lg: "text-3xl" };

export function ScoreBar({ score, size = "md", showLabel = true, className = "" }: ScoreBarProps) {
  const { bar, text } = scoreColor(score);
  const clamped = Math.max(0, Math.min(100, score));
  const rounded = Math.round(score);

  const track = (
    <div className={`${BAR_HEIGHT[size]} ${BAR_WIDTH[size]} overflow-hidden rounded-full bg-spy-surface`}>
      <div className={`h-full rounded-full ${bar}`} style={{ width: `${clamped}%` }} />
    </div>
  );

  const meterProps = { role: "meter" as const, "aria-valuenow": score, "aria-valuemin": 0, "aria-valuemax": 100 };

  if (size === "sm") {
    return (
      <div className={className} {...meterProps}>
        {track}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className={`flex flex-col gap-2 ${className}`} {...meterProps}>
        <span className={`font-data font-bold tabular-nums ${NUMBER_SIZE.lg} ${text}`}>{rounded}</span>
        {track}
        {showLabel && <span className="text-xs text-spy-muted">{tierLabel(score)}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} {...meterProps}>
      {track}
      <span className={`font-data font-semibold tabular-nums ${NUMBER_SIZE.md} ${text}`}>{rounded}</span>
    </div>
  );
}
