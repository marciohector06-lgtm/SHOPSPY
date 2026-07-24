import { fetchCategoryTrends, ApiError } from "../../lib/api";
import { getAccessTokenCookie, getCurrentUser } from "../../lib/auth";
import { CategoryHeatmap } from "../../components/CategoryHeatmap";
import { CategoryTrendChart } from "../../components/CategoryTrendChart";
import { ClassificationDistribution } from "../../components/ClassificationDistribution";
import { ErrorState } from "../../components/ui/ErrorState";
import { UpgradeState } from "../../components/ui/UpgradeState";

const CHART_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#F43F5E", "#F97316"];

export default async function TendenciasPage() {
  const user = await getCurrentUser();

  if (!user || user.plan !== "PRO") {
    return <UpgradeState message="Tendências por categoria são exclusivas do plano PRO." upgradeUrl="/pricing" />;
  }

  const token = getAccessTokenCookie();

  let data;
  try {
    data = await fetchCategoryTrends(token);
  } catch (error) {
    if (error instanceof ApiError && error.code === "PRO_REQUIRED") {
      return <UpgradeState message={error.message} upgradeUrl={error.upgradeUrl ?? "/pricing"} />;
    }
    return <ErrorState message={error instanceof Error ? error.message : "Erro desconhecido."} />;
  }

  return (
    <div className="flex flex-col gap-8">
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
    </div>
  );
}
