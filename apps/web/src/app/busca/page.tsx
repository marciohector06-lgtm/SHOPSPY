import { fetchProducts, ApiError } from "../../lib/api";
import { getAccessTokenCookie, getCurrentUser } from "../../lib/auth";
import { SearchResultsList } from "../../components/SearchResultsList";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { UpgradeState } from "../../components/ui/UpgradeState";
import { SearchIcon } from "../../components/icons";

export default async function BuscaPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = (searchParams.q ?? "").trim();
  const user = await getCurrentUser();

  if (!user || user.plan !== "PRO") {
    return <UpgradeState message="A busca de produtos é exclusiva do plano PRO." upgradeUrl="/pricing" />;
  }

  if (!query) {
    return (
      <EmptyState
        icon={<SearchIcon className="h-8 w-8" />}
        title="Digite algo pra buscar"
        message="Use a barra de busca no topo da página pra encontrar um produto específico."
      />
    );
  }

  const token = getAccessTokenCookie();

  let items;
  try {
    const page = await fetchProducts({ q: query }, token);
    items = page.items;
  } catch (error) {
    if (error instanceof ApiError && error.code === "PRO_REQUIRED") {
      return <UpgradeState message={error.message} upgradeUrl={error.upgradeUrl ?? "/pricing"} />;
    }
    return <ErrorState message={error instanceof Error ? error.message : "Erro desconhecido."} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-bold text-spy-text">Resultados para: {query}</h1>
        <p className="text-sm text-spy-muted">
          {items.length} {items.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-8 w-8" />}
          title={`Nenhum produto encontrado para "${query}"`}
          message="Tente termos mais simples."
        />
      ) : (
        <SearchResultsList items={items} />
      )}
    </div>
  );
}
