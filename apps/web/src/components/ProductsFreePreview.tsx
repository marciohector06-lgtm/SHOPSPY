import type { ProductDetail } from "../lib/types";
import { ProductRow } from "./ProductRow";
import { UpgradeState } from "./ui/UpgradeState";

/**
 * Nunca redireciona: mostra que o conteúdo existe (3 produtos reais, o
 * mesmo top que /explorar já usa pro FREE), só desfocado — a decisão de
 * assinar fica visivelmente motivada, não é uma tela vazia com um cadeado.
 */
export function ProductsFreePreview({ items }: { items: ProductDetail[] }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-spy-border" style={{ minHeight: 260 }}>
      <div aria-hidden className="pointer-events-none select-none blur-sm">
        {items.map((product, index) => (
          <ProductRow key={product.id} product={product} rank={index + 1} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-spy-base/40 p-6">
        <UpgradeState message="A tabela completa de produtos é exclusiva do plano PRO." upgradeUrl="/pricing" />
      </div>
    </div>
  );
}
