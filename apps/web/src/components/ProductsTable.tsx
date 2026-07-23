"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, ScoreClass } from "@shopspy/shared";
import { CATEGORIES, SCORE_CLASSES } from "@shopspy/shared";
import type { ProductDetail } from "../lib/types";
import { latestScore } from "../lib/product";
import { ApiError, fetchProducts } from "../lib/api";
import { formatBRL, formatCategory, formatCompactNumber } from "../lib/format";
import { ProductImage } from "./ProductImage";
import { ProductCard } from "./ProductCard";
import { ScoreBar } from "./ScoreBar";
import { OpportunityBadge, CLASSIFICATION_LABELS } from "./OpportunityBadge";
import { WindowBadge } from "./WindowBadge";
import { UGCScriptModal } from "./UGCScriptModal";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";
import { PackageIcon } from "./icons";

type SortKey = "name" | "score" | "classification" | "window" | "commission" | "soldBR" | "rankAmazon" | "category";
type SortDirection = "asc" | "desc";

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "name", label: "Produto" },
  { key: "score", label: "Score" },
  { key: "classification", label: "Classificação" },
  { key: "window", label: "Janela" },
  { key: "commission", label: "Comissão" },
  { key: "soldBR", label: "Vendidos BR" },
  { key: "rankAmazon", label: "Rank Amazon" },
  { key: "category", label: "Categoria" },
];

const CLASSIFICATION_RANK: Record<ScoreClass, number> = { MAXIMUM: 5, HIGH: 4, MEDIUM: 3, SATURATING: 2, AVOID: 1 };
const SCORE_MIN_OPTIONS = [0, 50, 65, 80];
const LOAD_MORE_SIZE = 50;

function sortValue(product: ProductDetail, key: SortKey): number | string {
  const score = latestScore(product);
  switch (key) {
    case "name":
      return product.name.toLowerCase();
    case "score":
      return score?.scoreTotal ?? -1;
    case "classification":
      return score ? CLASSIFICATION_RANK[score.classification] : 0;
    case "window":
      return score?.windowWeeks ?? -1;
    case "commission":
      return product.commissionValueBR ?? -1;
    case "soldBR":
      return product.soldCountBR ?? -1;
    case "rankAmazon":
      return product.amazonRankUS ?? product.amazonRankUK ?? Number.MAX_SAFE_INTEGER;
    case "category":
      return formatCategory(product.category);
  }
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="text-spy-faint">↕</span>;
  return <span className="text-spy-indigo-light">{direction === "asc" ? "↑" : "↓"}</span>;
}

interface ProductsTableProps {
  initialItems: ProductDetail[];
  initialCursor: string | null;
}

export function ProductsTable({ initialItems, initialCursor }: ProductsTableProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const [category, setCategory] = useState<Category | "">("");
  const [classification, setClassification] = useState<ScoreClass | "">("");
  const [scoreMin, setScoreMin] = useState(0);
  const [search, setSearch] = useState("");

  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "score", direction: "desc" });
  const [scriptProduct, setScriptProduct] = useState<ProductDetail | null>(null);

  const visibleItems = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    const filtered = items.filter((product) => {
      if (category && product.category !== category) return false;
      const score = latestScore(product);
      if (classification && score?.classification !== classification) return false;
      if (scoreMin > 0 && (score?.scoreTotal ?? 0) < scoreMin) return false;
      if (searchLower && !product.name.toLowerCase().includes(searchLower)) return false;
      return true;
    });

    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });
  }, [items, category, classification, scoreMin, search, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, direction: prev.direction === "desc" ? "asc" : "desc" } : { key, direction: "desc" }));
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchProducts({ cursor, limit: LOAD_MORE_SIZE });
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (error) {
      setLoadMoreError(error instanceof ApiError ? error.message : "Falha ao carregar mais produtos.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 border-b border-spy-border bg-spy-base/95 py-3 backdrop-blur-xl">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          className="rounded-md border border-spy-border bg-spy-surface px-2.5 py-1.5 text-xs text-spy-text"
        >
          <option value="">Categoria: todas</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>

        <select
          value={classification}
          onChange={(e) => setClassification(e.target.value as ScoreClass | "")}
          className="rounded-md border border-spy-border bg-spy-surface px-2.5 py-1.5 text-xs text-spy-text"
        >
          <option value="">Classificação: todas</option>
          {SCORE_CLASSES.map((c) => (
            <option key={c} value={c}>
              {CLASSIFICATION_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          value={scoreMin}
          onChange={(e) => setScoreMin(Number(e.target.value))}
          className="rounded-md border border-spy-border bg-spy-surface px-2.5 py-1.5 text-xs text-spy-text"
        >
          {SCORE_MIN_OPTIONS.map((min) => (
            <option key={min} value={min}>
              {min === 0 ? "Score mín.: qualquer" : `Score mín.: ${min}+`}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto... 🔍"
          className="min-w-[180px] flex-1 rounded-md border border-spy-border bg-spy-surface px-2.5 py-1.5 text-xs text-spy-text placeholder:text-spy-faint"
        />
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="h-8 w-8" />}
          title="Nenhum produto encontrado"
          message="Ajuste os filtros ou a busca para ver resultados."
        />
      ) : (
        <>
          {/* Desktop/tablet: tabela densa com scroll horizontal se precisar */}
          <div className="hidden overflow-x-auto rounded-xl border border-spy-border sm:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-spy-border text-xs text-spy-muted">
                  <th className="px-3 py-2 font-medium">#</th>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 font-medium">
                      <button type="button" onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-spy-text">
                        {col.label}
                        <SortIcon active={sort.key === col.key} direction={sort.direction} />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((product, index) => {
                  const score = latestScore(product);
                  return (
                    <tr
                      key={product.id}
                      onClick={() => router.push(`/produto/${product.id}`)}
                      className="cursor-pointer border-b border-spy-border last:border-b-0 hover:bg-spy-hover"
                    >
                      <td className="px-3 py-2 text-xs text-spy-muted">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex min-w-[220px] items-center gap-2">
                          <ProductImage src={product.imageUrl} name={product.name} size={36} className="shrink-0 rounded-md" />
                          <span className="line-clamp-2 text-sm text-spy-text">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{score ? <ScoreBar score={score.scoreTotal} size="md" /> : "—"}</td>
                      <td className="px-3 py-2">{score ? <OpportunityBadge classification={score.classification} /> : "—"}</td>
                      <td className="px-3 py-2">
                        <WindowBadge label={score?.windowLabel ?? null} />
                      </td>
                      <td className="px-3 py-2 text-xs text-spy-muted">{formatBRL(product.commissionValueBR)}</td>
                      <td className="px-3 py-2 text-xs text-spy-muted">{formatCompactNumber(product.soldCountBR)}</td>
                      <td className="px-3 py-2 text-xs text-spy-muted">
                        {product.amazonRankUS ? `#${product.amazonRankUS}` : product.amazonRankUK ? `#${product.amazonRankUK}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-spy-muted">{formatCategory(product.category)}</td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setScriptProduct(product)}
                          className="whitespace-nowrap rounded-md border border-spy-border px-2.5 py-1 text-xs font-medium text-spy-text hover:border-spy-indigo/40 hover:text-spy-indigo-light"
                        >
                          Roteiro UGC
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: tabela densa não cabe — lista de cards, mesmo componente do /explorar */}
          <div className="flex flex-col gap-4 sm:hidden">
            {visibleItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      {loadMoreError && <ErrorState message={loadMoreError} onRetry={loadMore} />}

      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="self-center rounded-md border border-spy-border px-4 py-2 text-sm font-medium text-spy-text transition-colors hover:border-spy-indigo/40 hover:text-spy-indigo-light disabled:opacity-50"
        >
          {loadingMore ? "Carregando…" : "Carregar mais 50"}
        </button>
      )}

      {scriptProduct && (
        <UGCScriptModal
          productId={scriptProduct.id}
          productName={scriptProduct.name}
          isOpen
          onClose={() => setScriptProduct(null)}
        />
      )}
    </div>
  );
}
