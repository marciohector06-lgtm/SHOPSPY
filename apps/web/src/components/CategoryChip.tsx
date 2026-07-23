import type { Category } from "@shopspy/shared";
import { formatCategory } from "../lib/format";
import { scoreColor } from "./ScoreBar";

export function CategoryChip({ category, averageScore }: { category: Category; averageScore: number }) {
  const { text } = scoreColor(averageScore);

  return (
    <div className="flex items-center justify-between gap-3 rounded-full border border-spy-border bg-spy-surface px-3 py-1.5 text-xs">
      <span className="text-spy-text">{formatCategory(category)}</span>
      <span className={`font-data font-semibold tabular-nums ${text}`}>{Math.round(averageScore)}</span>
    </div>
  );
}
