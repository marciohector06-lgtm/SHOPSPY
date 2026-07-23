import { fetchDashboardSummary, fetchHealth, fetchTopOpportunities } from "../../lib/api";
import { getAccessTokenCookie, getCurrentUser } from "../../lib/auth";
import { formatRelativeMinutes } from "../../lib/format";
import { OpportunitiesView } from "../../components/OpportunitiesView";

export default async function OportunidadesPage() {
  const user = await getCurrentUser();
  const token = getAccessTokenCookie();
  const isFree = !user || user.plan !== "PRO";

  const [opportunities, health, dashboard] = await Promise.all([
    fetchTopOpportunities({}, token),
    fetchHealth().catch(() => null),
    // dashboard/summary é PRO-only — FREE recebe PRO_REQUIRED aqui, e o
    // contador de produtos monitorados simplesmente some do header (não
    // quebra a página por um dado que esse plano não tem acesso mesmo).
    fetchDashboardSummary(token).catch(() => null),
  ]);

  const scoreCalculatorRun = health?.scrapers.find((s) => s.source === "SCORE_CALCULATOR")?.lastRun ?? null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-spy-text">Oportunidades de Mercado</h1>
        <p className="text-sm text-spy-muted">Produtos detectados globalmente antes de saturarem no Brasil.</p>
        {(dashboard || scoreCalculatorRun) && (
          <p className="text-xs text-spy-faint">
            {dashboard && `${dashboard.monitoredProducts} produtos monitorados`}
            {dashboard && scoreCalculatorRun && " • "}
            {scoreCalculatorRun && `Atualizado ${formatRelativeMinutes(scoreCalculatorRun.at)}`}
          </p>
        )}
      </header>

      <OpportunitiesView items={opportunities.items} isFree={isFree} />
    </div>
  );
}
