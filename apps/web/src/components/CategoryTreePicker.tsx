"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@shopspy/shared";
import { CATEGORIES, SUBCATEGORIES } from "@shopspy/shared";
import { formatCategory } from "../lib/format";

interface CategoryTreePickerProps {
  /** Nomes de subcategoria selecionados (across qualquer categoria) — vazio = "todas". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * Painel de categoria em 2 colunas (categoria -> subcategoria) com busca e
 * múltipla seleção, no estilo do seletor de categoria do TikTok Shop. Só 2
 * níveis (ShopSpy não tem sub-subcategoria ainda — ver plano/DEPLOY.md).
 * Subcategoria é preenchida aos poucos pelo job SUBCATEGORY_CLASSIFIER
 * (packages/queue/src/subcategoryClassifier.ts), então o filtro em
 * ProductsTable.tsx também deixa passar produto da categoria selecionada
 * ainda sem subcategoria classificada, pra não esconder catálogo real.
 */
export function CategoryTreePicker({ selected, onChange }: CategoryTreePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [viewedCategory, setViewedCategory] = useState<Category>(CATEGORIES[0]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const searchLower = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!searchLower) return null;
    const results: Array<{ category: Category; subcategory: string }> = [];
    for (const category of CATEGORIES) {
      const categoryLabel = formatCategory(category).toLowerCase();
      for (const subcategory of SUBCATEGORIES[category]) {
        if (categoryLabel.includes(searchLower) || subcategory.toLowerCase().includes(searchLower)) {
          results.push({ category, subcategory });
        }
      }
    }
    return results;
  }, [searchLower]);

  function toggle(subcategory: string) {
    const next = new Set(selected);
    if (next.has(subcategory)) next.delete(subcategory);
    else next.add(subcategory);
    onChange(next);
  }

  function toggleAllInCategory(category: Category, checked: boolean) {
    const next = new Set(selected);
    for (const subcategory of SUBCATEGORIES[category]) {
      if (checked) next.add(subcategory);
      else next.delete(subcategory);
    }
    onChange(next);
  }

  const label = selected.size === 0 ? "Categoria: todas" : `Categoria: ${selected.size} selecionada${selected.size === 1 ? "" : "s"}`;
  const viewedSubcategories = SUBCATEGORIES[viewedCategory];
  const allViewedSelected = viewedSubcategories.every((s) => selected.has(s));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-1.5 rounded-md border border-spy-border bg-spy-surface px-2.5 text-xs text-spy-text"
      >
        {label}
        <span className="text-spy-faint">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-20 flex w-[420px] flex-col overflow-hidden rounded-lg border border-spy-border bg-spy-card shadow-lg">
          <div className="border-b border-spy-border p-2">
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar nome da categoria"
              className="h-9 w-full rounded-md border border-spy-border bg-spy-surface px-2.5 text-xs text-spy-text placeholder:text-spy-faint"
            />
          </div>

          {searchResults ? (
            <div className="max-h-80 overflow-y-auto p-1">
              {searchResults.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-spy-muted">Nenhuma categoria encontrada.</p>
              ) : (
                searchResults.map(({ category, subcategory }) => (
                  <label
                    key={`${category}:${subcategory}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-spy-text hover:bg-spy-hover"
                  >
                    <input type="checkbox" checked={selected.has(subcategory)} onChange={() => toggle(subcategory)} />
                    <span className="flex-1">
                      {subcategory} <span className="text-spy-faint">— {formatCategory(category)}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-spy-border">
              <div className="max-h-80 overflow-y-auto p-1">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setViewedCategory(category)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs ${
                      category === viewedCategory ? "bg-spy-indigo/15 text-spy-indigo-light" : "text-spy-text hover:bg-spy-hover"
                    }`}
                  >
                    {formatCategory(category)}
                    <span className="text-spy-faint">›</span>
                  </button>
                ))}
              </div>
              <div className="max-h-80 overflow-y-auto p-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-spy-muted hover:bg-spy-hover">
                  <input
                    type="checkbox"
                    checked={allViewedSelected}
                    onChange={(e) => toggleAllInCategory(viewedCategory, e.target.checked)}
                  />
                  Selecionar todas
                </label>
                {viewedSubcategories.map((subcategory) => (
                  <label
                    key={subcategory}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-spy-text hover:bg-spy-hover"
                  >
                    <input type="checkbox" checked={selected.has(subcategory)} onChange={() => toggle(subcategory)} />
                    {subcategory}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-spy-border p-2">
            <button
              type="button"
              onClick={() => onChange(new Set())}
              disabled={selected.size === 0}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-spy-muted hover:text-spy-text disabled:opacity-40"
            >
              Limpar seleção
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-spy-indigo/15 px-3 py-1.5 text-xs font-medium text-spy-indigo-light hover:bg-spy-indigo/25"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
