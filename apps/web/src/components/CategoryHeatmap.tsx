import { formatCategory } from "../lib/format";
import type { CategoryHeatmapEntry } from "../lib/types";

export function CategoryHeatmap({ entries }: { entries: CategoryHeatmapEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {entries.map((entry) => {
        const hasData = entry.averageScore !== null;
        const intensity = hasData ? Math.max(entry.averageScore! / 100, 0.08) : 0;

        return (
          <div
            key={entry.category}
            className={`flex flex-col justify-between rounded-lg border p-3 ${hasData ? "border-indigo-800/40" : "border-dashed border-zinc-800"}`}
            style={hasData ? { backgroundColor: `rgba(99, 102, 241, ${intensity})` } : undefined}
          >
            <span className="text-xs font-medium text-zinc-200">{formatCategory(entry.category)}</span>
            <span className="mt-2 font-mono text-lg font-semibold tabular-nums text-zinc-100">
              {hasData ? Math.round(entry.averageScore!) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
