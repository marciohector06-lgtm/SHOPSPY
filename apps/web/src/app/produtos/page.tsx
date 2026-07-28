import Link from "next/link";
import { fetchProducts, fetchTopOpportunities, type ProductRegion } from "../../lib/api";
import { getAccessTokenCookie, getCurrentUser } from "../../lib/auth";
import { ProductsTable } from "../../components/ProductsTable";
import { ProductsFreePreview } from "../../components/ProductsFreePreview";

const INITIAL_PAGE_SIZE = 50;
const FREE_PREVIEW_SIZE = 3;

const TABS = [
  { key: "ALL", label: "Todas" },
  { key: "BR", label: "Brasil" },
  { key: "LATAM", label: "LATAM" },
  { key: "ASIA", label: "Ásia" },
  { key: "EUROPE", label: "Europa" },
  { key: "GLOBAL", label: "Global" },
] as const;

type RegionTab = (typeof TABS)[number]["key"];

function isRegionTab(value: string | string[] | undefined): value is Exclude<RegionTab, "ALL"> {
  return typeof value === "string" && TABS.some((tab) => tab.key === value && tab.key !== "ALL");
}

/**
 * Mesmo padrão de navegação por Link de /tendencias (RegionTabsNav) — sem
 * client component, troca de aba é navegação de URL normal (?region=...).
 * "Todas" é a aba sem parâmetro, preservando o comportamento anterior da
 * página (lista completa, sem filtro de região).
 */
function RegionTabsNav({ active }: { active: RegionTab }) {
  return (
    <nav className="flex w-fit gap-1 rounded-lg border border-spy-border bg-spy-card p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "ALL" ? "/produtos" : `/produtos?region=${tab.key}`}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab.key === active ? "bg-spy-indigo/15 text-spy-indigo-light" : "text-spy-muted hover:text-spy-text"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Carrega os primeiros 50 produtos aqui, no server — filtro/ordenação
 * viram trabalho 100% client-side em cima desse array (ProductsTable),
 * sem refetch a cada interação. A aba de região (?region=) é server-side:
 * trocar de aba navega pra uma nova URL e busca de novo, igual /tendencias.
 */
export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: { region?: string | string[] };
}) {
  const user = await getCurrentUser();
  const token = getAccessTokenCookie();

  if (!user || user.plan !== "PRO") {
    // /api/v1/products exige PRO — reaproveita /opportunities/top (o único
    // endpoint que FREE acessa) pra ter 3 produtos reais aqui, não 3 mocks.
    const preview = await fetchTopOpportunities({}, token).catch(() => ({ items: [], delayedAt: null }));
    return <ProductsFreePreview items={preview.items.slice(0, FREE_PREVIEW_SIZE)} />;
  }

  const activeTab: RegionTab = isRegionTab(searchParams.region) ? searchParams.region : "ALL";
  const region: ProductRegion | undefined = activeTab === "ALL" ? undefined : activeTab;

  const page = await fetchProducts({ limit: INITIAL_PAGE_SIZE, region }, token);

  return (
    <div className="flex flex-col gap-4">
      <RegionTabsNav active={activeTab} />
      <ProductsTable initialItems={page.items} initialCursor={page.nextCursor} region={region} />
    </div>
  );
}
