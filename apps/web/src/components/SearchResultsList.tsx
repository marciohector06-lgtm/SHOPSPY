"use client";

import { useState } from "react";
import type { ProductDetail } from "../lib/types";
import { OpportunityCard } from "./OpportunityCard";
import { UGCScriptModal } from "./UGCScriptModal";
import { CreateAlertModal } from "./CreateAlertModal";

/** Mesmo card cheio de /oportunidades (score/gap/classificação/janela/Roteiro UGC/Criar alerta) — resultado de busca é uma oportunidade como qualquer outra. */
export function SearchResultsList({ items }: { items: ProductDetail[] }) {
  const [scriptProduct, setScriptProduct] = useState<ProductDetail | null>(null);
  const [alertProduct, setAlertProduct] = useState<ProductDetail | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {items.map((product) => (
        <OpportunityCard
          key={product.id}
          product={product}
          onOpenScript={() => setScriptProduct(product)}
          onOpenAlert={() => setAlertProduct(product)}
        />
      ))}

      {scriptProduct && (
        <UGCScriptModal
          productId={scriptProduct.id}
          productName={scriptProduct.name}
          isOpen
          onClose={() => setScriptProduct(null)}
        />
      )}
      {alertProduct && (
        <CreateAlertModal
          productId={alertProduct.id}
          productName={alertProduct.name}
          isOpen
          onClose={() => setAlertProduct(null)}
        />
      )}
    </div>
  );
}
