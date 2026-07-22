"use client";

import { useAsyncData } from "../hooks/useAsyncData";
import { useScraperStream } from "../hooks/useScraperStream";
import { fetchHealth } from "../lib/api";
import { AsyncView } from "./ui/AsyncView";
import { Skeleton } from "./ui/Skeleton";

function statusColor(state: string | undefined): string {
  switch (state) {
    case "running":
      return "bg-emerald-500 animate-pulse";
    case "success":
      return "bg-emerald-500";
    case "partial":
      return "bg-yellow-500";
    case "error":
    case "timeout":
      return "bg-red-500";
    default:
      return "bg-zinc-600";
  }
}

function connectionLabel(state: "connecting" | "open" | "error"): { text: string; color: string } {
  if (state === "open") return { text: "● live", color: "text-emerald-400" };
  if (state === "error") return { text: "● reconectando", color: "text-red-400" };
  return { text: "● conectando", color: "text-zinc-500" };
}

/** GET /api/v1/stream mantém isso atualizado sem refresh — SSE reconecta sozinho se cair. */
export function ScraperStatusPanel() {
  const healthState = useAsyncData(fetchHealth, []);
  const { statuses, connectionState } = useScraperStream();
  const connection = connectionLabel(connectionState);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Status dos Scrapers</h3>
        <span className={`text-[10px] ${connection.color}`}>{connection.text}</span>
      </div>

      <AsyncView
        state={healthState}
        loading={
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        }
      >
        {(health) => (
          <ul className="flex flex-col gap-1.5">
            {health.scrapers.map((scraper) => {
              const live = statuses[scraper.source];
              const state = live?.state ?? scraper.lastRun?.status;
              const items = live?.itemsFound ?? scraper.lastRun?.itemsFound;

              return (
                <li key={scraper.source} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <span className={`h-2 w-2 rounded-full ${statusColor(state)}`} />
                    {scraper.source}
                  </span>
                  <span className="font-mono tabular-nums text-zinc-500">{items ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </AsyncView>
    </div>
  );
}
