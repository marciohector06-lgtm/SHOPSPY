import type { CategoryHeatmapEntry } from "../lib/types";
import { formatCategory, formatPercent } from "../lib/format";

/** Score>=80 verde escuro / 65-80 verde / 50-65 âmbar / <50 cinza — escala de "calor" da categoria, não a cor de urgência do OpportunityBadge. */
function heatColor(score: number): string {
  if (score >= 80) return "bg-[#065F46] text-white";
  if (score >= 65) return "bg-spy-high text-black/80";
  if (score >= 50) return "bg-spy-medium text-black/80";
  return "bg-spy-avoid text-white";
}

function cellTitle(entry: CategoryHeatmapEntry): string {
  const label = formatCategory(entry.category);
  if (entry.averageScore === null) return `${label}: sem dado ainda`;
  const change =
    entry.weeklyChangePct === null ? "sem variação anterior" : `${formatPercent(entry.weeklyChangePct, 1)} na semana`;
  return `${label} — score ${Math.round(entry.averageScore)} (${change})`;
}

/** Grid de calor por categoria — hover mostra score exato + variação semanal via `title` nativo. */
export function CategoryHeatmap({ entries }: { entries: CategoryHeatmapEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {entries.map((entry) => (
        <div
          key={entry.category}
          title={cellTitle(entry)}
          className={`flex cursor-default flex-col gap-1 rounded-lg p-3 transition-transform hover:scale-[1.03] ${
            entry.averageScore === null
              ? "border border-dashed border-spy-border text-spy-muted"
              : heatColor(entry.averageScore)
          }`}
        >
          <span className="line-clamp-1 text-xs font-medium">{formatCategory(entry.category)}</span>
          <span className="font-data text-lg font-bold tabular-nums">
            {entry.averageScore === null ? "—" : Math.round(entry.averageScore)}
          </span>
        </div>
      ))}
    </div>
  );
}
