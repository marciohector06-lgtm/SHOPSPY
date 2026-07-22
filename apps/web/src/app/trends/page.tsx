"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchCategoryTrends } from "../../lib/api";
import { formatCategory } from "../../lib/format";
import { useAsyncData } from "../../hooks/useAsyncData";
import { AsyncView } from "../../components/ui/AsyncView";
import { Skeleton } from "../../components/ui/Skeleton";
import { CategoryHeatmap } from "../../components/CategoryHeatmap";

export default function TrendsPage() {
  const state = useAsyncData(fetchCategoryTrends, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Tendências</h1>
        <p className="text-sm text-zinc-500">Score médio por categoria e comparativo BR vs Global.</p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Heatmap de categorias — score médio da semana</h2>
        <AsyncView
          state={state}
          loading={
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          }
        >
          {(data) => <CategoryHeatmap entries={data.heatmap} />}
        </AsyncView>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">BR vs Global — top 5 categorias (8 semanas)</h2>
        <AsyncView
          state={state}
          loading={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          }
        >
          {(data) =>
            data.categories.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">Ainda sem histórico suficiente para comparar.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.categories.map((entry) => (
                  <div key={entry.category} className="rounded-lg border border-zinc-800 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-300">{formatCategory(entry.category)}</span>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                          BR
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          Global
                        </span>
                      </div>
                    </div>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={entry.series}>
                          <XAxis dataKey="week" tick={{ fill: "#71717a", fontSize: 9 }} tickFormatter={(w: string) => w.split("-")[1] ?? w} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 9 }} width={28} />
                          <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 11 }} />
                          <Line type="monotone" dataKey="avgTrendsBR" name="BR" stroke="#a1a1aa" strokeWidth={1.5} dot={false} />
                          <Line type="monotone" dataKey="avgTrendsUS" name="Global" stroke="#818cf8" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </AsyncView>
      </div>
    </div>
  );
}
