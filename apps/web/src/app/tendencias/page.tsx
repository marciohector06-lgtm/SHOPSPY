import Link from "next/link";
import { fetchCategoryTrends, fetchRegionalHeatmap, ApiError } from "../../lib/api";
import { getAccessTokenCookie, getCurrentUser } from "../../lib/auth";
import { CategoryHeatmap } from "../../components/CategoryHeatmap";
import { CategoryTrendChart } from "../../components/CategoryTrendChart";
import { ClassificationDistribution } from "../../components/ClassificationDistribution";
import { ErrorState } from "../../components/ui/ErrorState";
import { UpgradeState } from "../../components/ui/UpgradeState";

const CHART_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#F43F5E", "#F97316"];

const TABS = [
  { key: "BR", label: "Brasil" },
  { key: "LATAM", label: "LATAM" },
  { key: "ASIA", label: "Ásia" },
  { key: "EUROPE", label: "Europa" },
  { key: "GLOBAL", label: "Global" },
] as const;

type RegionTab = (typeof TABS)[number]["key"];

function isRegionTab(value: string | string[] | undefined): value is RegionTab {
  return typeof value === "string" && TABS.some((tab) => tab.key === value);
}

/**
 * Navegação por Link (sem client component nenhum) — o resto do app inteiro
 * é server component puro (nenhuma outra página usa "use client"), então a
 * troca de aba vira navegação de URL normal (?region=...) em vez de um
 * padrão novo de estado no cliente.
 */
function RegionTabsNav({ active }: { active: RegionTab }) {
  return (
    <nav className="flex w-fit gap-1 rounded-lg border border-spy-border bg-spy-card p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "BR" ? "/tendencias" : `/tendencias?region=${tab.key}`}
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

async function BrazilTrends({ token }: { token?: string }) {
  const data = await fetchCategoryTrends(token);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold text-spy-text">Heatmap de categorias</h2>
        <CategoryHeatmap entries={data.heatmap} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold text-spy-text">Brasil x Global — top 5 categorias (8 semanas)</h2>
        {data.categories.length === 0 ? (
          <p className="rounded-lg border border-dashed border-spy-border px-6 py-10 text-center text-sm text-spy-muted">
            Sem histórico suficiente ainda pra montar a série semanal.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.categories.map((series, i) => (
              <CategoryTrendChart key={series.category} series={series} color={CHART_COLORS[i % CHART_COLORS.length]!} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold text-spy-text">Distribuição por classificação</h2>
        <div className="rounded-lg border border-spy-border bg-spy-card p-4">
          <ClassificationDistribution counts={data.classificationDistribution} />
        </div>
      </section>
    </>
  );
}

const REGION_LABELS: Record<Exclude<RegionTab, "BR">, string> = {
  LATAM: "LATAM (México, Colômbia, Argentina, Chile)",
  ASIA: "Ásia (Tailândia, Indonésia, Vietnã, Japão)",
  EUROPE: "Europa (França, Alemanha, Itália)",
  GLOBAL: "Global (EUA)",
};

async function RegionalTrends({ region, token }: { region: Exclude<RegionTab, "BR">; token?: string }) {
  const heatmap = await fetchRegionalHeatmap(region, token);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-spy-text">Heatmap de categorias — {REGION_LABELS[region]}</h2>
      {heatmap.every((entry) => entry.averageScore === null) ? (
        <p className="rounded-lg border border-dashed border-spy-border px-6 py-10 text-center text-sm text-spy-muted">
          Ainda sem dado suficiente nessa região essa semana.
        </p>
      ) : (
        <CategoryHeatmap entries={heatmap} />
      )}
    </section>
  );
}

export default async function TendenciasPage({
  searchParams,
}: {
  searchParams: { region?: string | string[] };
}) {
  const user = await getCurrentUser();

  if (!user || user.plan !== "PRO") {
    return <UpgradeState message="Tendências por categoria são exclusivas do plano PRO." upgradeUrl="/pricing" />;
  }

  const token = getAccessTokenCookie();
  const activeTab: RegionTab = isRegionTab(searchParams.region) ? searchParams.region : "BR";

  let content;
  try {
    content = activeTab === "BR" ? await BrazilTrends({ token }) : await RegionalTrends({ region: activeTab, token });
  } catch (error) {
    if (error instanceof ApiError && error.code === "PRO_REQUIRED") {
      return <UpgradeState message={error.message} upgradeUrl={error.upgradeUrl ?? "/pricing"} />;
    }
    content = <ErrorState message={error instanceof Error ? error.message : "Erro desconhecido."} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <RegionTabsNav active={activeTab} />
      {content}
    </div>
  );
}
