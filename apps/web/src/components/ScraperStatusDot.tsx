import type { ScraperStatusEntry } from "../lib/types";
import { formatDate } from "../lib/format";

const STATUS_DOT: Record<string, string> = {
  success: "bg-spy-high",
  partial: "bg-spy-medium",
  error: "bg-spy-max",
  timeout: "bg-spy-max",
};

export function ScraperStatusDot({ entry }: { entry: ScraperStatusEntry }) {
  const dotColor = entry.lastRun ? STATUS_DOT[entry.lastRun.status] ?? "bg-spy-faint" : "bg-spy-faint";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-spy-surface px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} aria-hidden />
        <span className="text-spy-text">{entry.label}</span>
      </div>
      <span className="text-spy-muted">
        {entry.lastRun ? formatDate(entry.lastRun.at) : "Nunca rodou"}
      </span>
    </div>
  );
}
