"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchDashboardSummary } from "../../lib/api";
import { formatCategory } from "../../lib/format";
import { useAsyncData } from "../../hooks/useAsyncData";
import { AsyncView } from "../../components/ui/AsyncView";
import { Skeleton, SkeletonCards } from "../../components/ui/Skeleton";
import { MetricCard } from "../../components/MetricCard";
import { ScoreBar } from "../../components/ScoreBar";
import { OpportunityBadge } from "../../components/OpportunityBadge";
import { ScraperStatusPanel } from "../../components/ScraperStatusPanel";

export default function DashboardPage() {
  const state = useAsyncData(fetchDashboardSummary, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500">Visão geral da semana.</p>
      </div>

      <AsyncView state={state} loading={<SkeletonCards count={4} />}>
        {(summary) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Produtos monitorados" value={String(summary.monitoredProducts)} />
            <MetricCard
              label="Melhor score da semana"
              value={summary.bestScoreThisWeek !== null ? Math.round(summary.bestScoreThisWeek).toString() : "—"}
            />
            <MetricCard label="Novos produtos (48h)" value={String(summary.newProductsLast48h)} />
            <MetricCard label="Alertas disparados hoje" value={String(summary.alertsFiredToday)} />
          </div>
        )}
      </AsyncView>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Top 5 categorias — score médio</h2>
          <AsyncView state={state} loading={<Skeleton className="h-56 w-full" />}>
            {(summary) =>
              summary.topCategories.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">Ainda sem scores calculados nesta semana.</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={summary.topCategories.map((c) => ({ ...c, categoryLabel: formatCategory(c.category) }))}
                      layout="vertical"
                      margin={{ left: 24 }}
                    >
                      <CartesianGrid stroke="#27272a" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                      <YAxis type="category" dataKey="categoryLabel" width={110} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }}
                        formatter={(value: number) => Math.round(value)}
                      />
                      <Bar dataKey="averageScore" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </AsyncView>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Top 5 oportunidades da semana</h2>
          <AsyncView
            state={state}
            loading={
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            }
          >
            {(summary) =>
              summary.topOpportunities.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">Nenhuma oportunidade pontuada ainda.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {summary.topOpportunities.map((opp) => (
                    <li key={opp.productId} className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <a href={`/products/${opp.productId}`} className="text-sm text-zinc-200 hover:text-indigo-300">
                          {opp.name}
                        </a>
                        <OpportunityBadge classification={opp.classification} />
                      </div>
                      <ScoreBar score={opp.scoreTotal} />
                    </li>
                  ))}
                </ul>
              )
            }
          </AsyncView>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-sm">
          <ScraperStatusPanel />
        </div>
      </div>
    </div>
  );
}
