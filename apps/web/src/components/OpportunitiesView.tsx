"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, ScoreClass } from "@shopspy/shared";
import { SCORE_CLASSES } from "@shopspy/shared";
import type { ProductDetail } from "../lib/types";
import { latestScore } from "../lib/product";
import { formatCategory } from "../lib/format";
import { OpportunityCard } from "./OpportunityCard";
import { PreviewBadge } from "./PreviewBadge";
import { UGCScriptModal } from "./UGCScriptModal";
import { EmptyState } from "./ui/EmptyState";
import { UpgradeState } from "./ui/UpgradeState";
import { Skeleton, SkeletonProductCard } from "./ui/Skeleton";
import { CLASSIFICATION_LABELS, CLASSIFICATION_COLORS } from "./OpportunityBadge";
import { PackageIcon } from "./icons";

type SortMode = "score" | "recent" | "commission";
const REVEAL_CHUNK = 20;

const SORT_LABELS: Record<SortMode, string> = {
  score: "Score (maior primeiro)",
  recent: "Mais recentes primeiro",
  commission: "Maior comissão primeiro",
};

function sortItems(items: ProductDetail[], sort: SortMode): ProductDetail[] {
  const copy = [...items];
  if (sort === "recent") {
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === "commission") {
    copy.sort((a, b) => (b.commissionValueBR ?? -1) - (a.commissionValueBR ?? -1));
  } else {
    copy.sort((a, b) => (latestScore(b)?.scoreTotal ?? -1) - (latestScore(a)?.scoreTotal ?? -1));
  }
  return copy;
}

interface OpportunitiesViewProps {
  items: ProductDetail[];
  isFree: boolean;
}

export function OpportunitiesView({ items, isFree }: OpportunitiesViewProps) {
  const [classification, setClassification] = useState<ScoreClass | "">("");
  const [category, setCategory] = useState<Category | "">("");
  const [windowLabel, setWindowLabel] = useState("");
  const [sort, setSort] = useState<SortMode>("score");
  const [visibleCount, setVisibleCount] = useState(REVEAL_CHUNK);
  const [scriptProduct, setScriptProduct] = useState<ProductDetail | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(() => Array.from(new Set(items.map((p) => p.category))).sort(), [items]);
  const windowLabels = useMemo(
    () =>
      Array.from(new Set(items.map((p) => latestScore(p)?.windowLabel).filter((label): label is string => Boolean(label)))),
    [items]
  );

  const filteredSorted = useMemo(() => {
    const filtered = items.filter((product) => {
      if (category && product.category !== category) return false;
      const score = latestScore(product);
      if (classification && score?.classification !== classification) return false;
      if (windowLabel && score?.windowLabel !== windowLabel) return false;
      return true;
    });
    return sortItems(filtered, sort);
  }, [items, category, classification, windowLabel, sort]);

  // Reseta a revelação gradual sempre que o conjunto filtrado muda — senão
  // sobra "furo" (produtos que já passaram do corte antigo, mas não do novo).
  useEffect(() => {
    setVisibleCount(REVEAL_CHUNK);
  }, [category, classification, windowLabel, sort]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + REVEAL_CHUNK, filteredSorted.length));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredSorted.length]);

  const visible = filteredSorted.slice(0, visibleCount);

  if (isFree) {
    return (
      <div className="flex flex-col gap-4">
        <PreviewBadge />
        <div className="flex flex-col gap-4">
          {items.map((product) => (
            <OpportunityCard key={product.id} product={product} onOpenScript={() => setScriptProduct(product)} />
          ))}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-spy-border" style={{ minHeight: 220 }}>
          <div aria-hidden className="pointer-events-none flex flex-col gap-4 select-none blur-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SkeletonProductCard />
              <SkeletonProductCard />
              <SkeletonProductCard />
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-spy-base/50 p-6">
            <UpgradeState message="Veja todas as oportunidades em tempo real, sem atraso." upgradeUrl="/pricing" />
          </div>
        </div>

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setClassification("")}
          className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium ring-1 ring-inset transition-colors ${
            classification === "" ? "bg-spy-indigo-dim text-spy-indigo-light ring-spy-indigo/40" : "text-spy-muted ring-spy-border hover:text-spy-text"
          }`}
        >
          Todas
        </button>
        {SCORE_CLASSES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setClassification(c)}
            className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium ring-1 ring-inset transition-colors ${
              classification === c ? CLASSIFICATION_COLORS[c] : "text-spy-muted ring-spy-border hover:text-spy-text"
            }`}
          >
            {CLASSIFICATION_LABELS[c]}
          </button>
        ))}

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          className="h-11 rounded-md border border-spy-border bg-spy-surface px-2.5 text-xs text-spy-text"
        >
          <option value="">Categoria: todas</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>

        <select
          value={windowLabel}
          onChange={(e) => setWindowLabel(e.target.value)}
          className="h-11 rounded-md border border-spy-border bg-spy-surface px-2.5 text-xs text-spy-text"
        >
          <option value="">Janela: todas</option>
          {windowLabels.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="ml-auto h-11 rounded-md border border-spy-border bg-spy-surface px-2.5 text-xs text-spy-text"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {filteredSorted.length === 0 ? (
        <EmptyState icon={<PackageIcon className="h-8 w-8" />} title="Nenhuma oportunidade encontrada" message="Ajuste os filtros para ver resultados." />
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {visible.map((product) => (
              <OpportunityCard key={product.id} product={product} onOpenScript={() => setScriptProduct(product)} />
            ))}
          </div>
          {visibleCount < filteredSorted.length && (
            <div ref={sentinelRef} className="flex flex-col gap-4">
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          )}
        </>
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
