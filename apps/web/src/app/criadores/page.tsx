import Link from "next/link";
import { UsersIcon } from "../../components/icons";

const UPCOMING_METRICS = ["Receita", "Seguidores", "Produtos promovidos", "Categoria principal"];

/** Stub permanente até o scraper de criadores existir — mostra o que vai aparecer, não inventa dado. */
export default function CriadoresPage() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border border-dashed border-spy-border px-6 py-12 text-center">
      <span className="text-spy-faint" aria-hidden>
        <UsersIcon className="h-10 w-10" />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-lg font-semibold text-spy-text">Dados de criadores estão sendo preparados</h1>
        <p className="max-w-md text-sm text-spy-muted">
          Essa seção precisa de um scraper dedicado, ainda não implementado. Assim que os dados chegarem, essas
          métricas aparecem aqui automaticamente:
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {UPCOMING_METRICS.map((metric) => (
          <div key={metric} className="rounded-lg border border-spy-border bg-spy-card px-4 py-3">
            <span className="text-xs text-spy-muted">{metric}</span>
          </div>
        ))}
      </div>

      <Link
        href="/oportunidades"
        className="rounded-md bg-spy-indigo px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light"
      >
        Ver oportunidades disponíveis
      </Link>
    </div>
  );
}
