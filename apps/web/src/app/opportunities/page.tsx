"use client";

import { useMemo, useState } from "react";
import type { ScoreClass, Category } from "@shopspy/shared";
import { CATEGORIES } from "@shopspy/shared";
import { fetchProducts } from "../../lib/api";
import { formatBRL, formatCategory } from "../../lib/format";
import type { ProductDetail, TrendScoreEntry } from "../../lib/types";
import { useAsyncData } from "../../hooks/useAsyncData";
import { AsyncView } from "../../components/ui/AsyncView";
import { SkeletonTableRows } from "../../components/ui/Skeleton";
import { ScoreBar } from "../../components/ScoreBar";
import { GapIndicator } from "../../components/GapIndicator";
import { OpportunityBadge } from "../../components/OpportunityBadge";
import { WindowBadge } from "../../components/WindowBadge";
import { SparklineChart } from "../../components/SparklineChart";
import { VideoGrid } from "../../components/VideoGrid";
import { UGCScriptModal } from "../../components/UGCScriptModal";

const CLASSIFICATION_FILTERS: Array<{ value: ScoreClass | "ALL"; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "MAXIMUM", label: "Máxima" },
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Média" },
];

function latestScore(product: ProductDetail): TrendScoreEntry | null {
  return product.scores.length > 0 ? product.scores[product.scores.length - 1]! : null;
}

export default function OpportunitiesPage() {
  const [classification, setClassification] = useState<ScoreClass | "ALL">("ALL");
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [minCommission, setMinCommission] = useState<string>("");
  const [scriptModalProduct, setScriptModalProduct] = useState<ProductDetail | null>(null);

  const state = useAsyncData(
    () => fetchProducts({ limit: 50, category: category === "ALL" ? undefined : category }),
    [category]
  );

  const filteredItems = useMemo(() => {
    if (state.status !== "success") return [];
    const min = minCommission ? Number(minCommission) : null;

    return state.data.items.filter((product) => {
      const score = latestScore(product);
      if (classification !== "ALL" && score?.classification !== classification) return false;
      if (min !== null && (product.commissionValueBR ?? 0) < min) return false;
      return true;
    });
  }, [state, classification, minCommission]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Oportunidades</h1>
        <p className="text-sm text-zinc-500">Produtos monitorados, rankeados pelo ShopSpy Score.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Classificação
          <select
            value={classification}
            onChange={(e) => setClassification(e.target.value as ScoreClass | "ALL")}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
          >
            {CLASSIFICATION_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "ALL")}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
          >
            <option value="ALL">Todas</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {formatCategory(cat)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Comissão mínima (R$)
          <input
            type="number"
            min={0}
            value={minCommission}
            onChange={(e) => setMinCommission(e.target.value)}
            placeholder="0"
            className="w-32 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 font-mono"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Score ShopSpy</th>
              <th className="px-4 py-3">Gap Global→BR</th>
              <th className="px-4 py-3">Janela</th>
              <th className="px-4 py-3">Comissão BR</th>
              <th className="px-4 py-3">Tendência</th>
              <th className="px-4 py-3">Vídeos</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            <AsyncView state={state} loading={<SkeletonTableRows rows={8} cols={8} />}>
              {() =>
                filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
                      Nenhum produto encontrado com esses filtros.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((product) => {
                    const score = latestScore(product);
                    return (
                      <tr key={product.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-lg">📦</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <a href={`/products/${product.id}`} className="font-medium text-zinc-100 hover:text-indigo-300">
                                {product.name}
                              </a>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">{formatCategory(product.category)}</span>
                                {score && <OpportunityBadge classification={score.classification} />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{score ? <ScoreBar score={score.scoreTotal} /> : <span className="text-xs text-zinc-500">—</span>}</td>
                        <td className="px-4 py-3">
                          {score ? <GapIndicator globalScore={score.trendsUS} brScore={score.trendsBR} /> : <span className="text-xs text-zinc-500">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <WindowBadge label={score?.windowLabel ?? null} />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-zinc-300">{formatBRL(product.commissionValueBR)}</td>
                        <td className="px-4 py-3">
                          <SparklineChart values={product.scores.map((s) => s.trendsBR)} />
                        </td>
                        <td className="px-4 py-3">
                          <VideoGrid videos={product.videos} variant="compact" limit={2} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setScriptModalProduct(product)}
                            className="rounded-md bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30"
                          >
                            Gerar Roteiro
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )
              }
            </AsyncView>
          </tbody>
        </table>
      </div>

      {scriptModalProduct && (
        <UGCScriptModal
          productId={scriptModalProduct.id}
          productName={scriptModalProduct.name}
          isOpen
          onClose={() => setScriptModalProduct(null)}
        />
      )}
    </div>
  );
}
