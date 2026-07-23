"use client";

import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchProduct } from "../../../lib/api";
import { formatBRL, formatCategory, formatCompactNumber, formatPercent } from "../../../lib/format";
import { useAsyncData } from "../../../hooks/useAsyncData";
import { AsyncView } from "../../../components/ui/AsyncView";
import { Skeleton } from "../../../components/ui/Skeleton";
import { OpportunityBadge } from "../../../components/OpportunityBadge";
import { WindowBadge } from "../../../components/WindowBadge";
import { VideoGrid } from "../../../components/VideoGrid";
import { UGCScriptModal } from "../../../components/UGCScriptModal";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800/60 py-2 text-sm last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-200">{value}</span>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const state = useAsyncData(() => fetchProduct(params.id), [params.id]);
  const [scriptOpen, setScriptOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <AsyncView
        state={state}
        loading={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        }
      >
        {(product) => {
          const latestScore = product.scores[product.scores.length - 1] ?? null;

          return (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-zinc-100">{product.name}</h1>
                  <p className="text-sm text-zinc-500">{formatCategory(product.category)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {latestScore && <OpportunityBadge classification={latestScore.classification} />}
                    <WindowBadge label={latestScore?.windowLabel ?? null} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScriptOpen(true)}
                  className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
                >
                  Gerar Roteiro UGC
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Brasil</h2>
                  <Stat label="Preço" value={formatBRL(product.priceBR)} />
                  <Stat label="Vendidos" value={formatCompactNumber(product.soldCountBR)} />
                  <Stat label="Avaliação" value={product.ratingBR ? `${product.ratingBR.toFixed(1)}★` : "—"} />
                  <Stat label="Buscas / semana" value={formatCompactNumber(product.searchesBR)} />
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Global</h2>
                  <Stat label="Impressões TikTok (US)" value={formatCompactNumber(product.tiktokImpressions)} />
                  <Stat label="CTR TikTok" value={formatPercent(product.tiktokCTR, 1)} />
                  <Stat label="Rank Amazon US" value={product.amazonRankUS ? `#${product.amazonRankUS}` : "—"} />
                  <Stat label="Rank Amazon UK" value={product.amazonRankUK ? `#${product.amazonRankUK}` : "—"} />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <h2 className="mb-3 text-sm font-semibold text-zinc-200">Histórico de score — últimas 8 semanas</h2>
                {product.scores.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">Sem histórico de score ainda.</p>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={product.scores.map((s) => ({ week: `S${s.weekNumber}`, score: s.scoreTotal }))}>
                        <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }} />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <h2 className="mb-3 text-sm font-semibold text-zinc-200">Vídeos de referência</h2>
                <VideoGrid videos={product.videos} variant="detailed" limit={6} />
              </div>

              <UGCScriptModal
                productId={product.id}
                productName={product.name}
                isOpen={scriptOpen}
                onClose={() => setScriptOpen(false)}
              />
            </>
          );
        }}
      </AsyncView>
    </div>
  );
}
