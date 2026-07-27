import { fetchAlerts } from "../../lib/api";
import { getAccessTokenCookie } from "../../lib/auth";
import { AlertsList } from "../../components/AlertsList";
import { EmptyState } from "../../components/ui/EmptyState";
import { BellIcon } from "../../components/icons";

export default async function AlertasPage() {
  const token = getAccessTokenCookie();
  const { items } = await fetchAlerts(token);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-bold text-spy-text">Meus alertas</h1>
        <p className="text-sm text-spy-muted">Você é notificado por e-mail quando o score de um produto ultrapassa o threshold configurado.</p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={<BellIcon className="h-8 w-8" />}
          title="Você não tem alertas configurados"
          message="Vá até um produto e clique em Criar alerta."
        />
      ) : (
        <AlertsList initialItems={items} />
      )}
    </div>
  );
}
