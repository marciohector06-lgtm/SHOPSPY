import { fetchProducts, fetchTopOpportunities } from "../../lib/api";
import { getAccessTokenCookie, getCurrentUser } from "../../lib/auth";
import { ProductsTable } from "../../components/ProductsTable";
import { ProductsFreePreview } from "../../components/ProductsFreePreview";

const INITIAL_PAGE_SIZE = 50;
const FREE_PREVIEW_SIZE = 3;

/**
 * Carrega os primeiros 50 produtos aqui, no server — filtro/ordenação
 * viram trabalho 100% client-side em cima desse array (ProductsTable),
 * sem refetch a cada interação.
 */
export default async function ProdutosPage() {
  const user = await getCurrentUser();
  const token = getAccessTokenCookie();

  if (!user || user.plan !== "PRO") {
    // /api/v1/products exige PRO — reaproveita /opportunities/top (o único
    // endpoint que FREE acessa) pra ter 3 produtos reais aqui, não 3 mocks.
    const preview = await fetchTopOpportunities({}, token).catch(() => ({ items: [], delayedAt: null }));
    return <ProductsFreePreview items={preview.items.slice(0, FREE_PREVIEW_SIZE)} />;
  }

  const page = await fetchProducts({ limit: INITIAL_PAGE_SIZE }, token);
  return <ProductsTable initialItems={page.items} initialCursor={page.nextCursor} />;
}
