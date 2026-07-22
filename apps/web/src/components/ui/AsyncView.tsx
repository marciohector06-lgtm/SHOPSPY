import type { ReactNode } from "react";
import type { AsyncState } from "../../hooks/useAsyncData";
import { ErrorState } from "./ErrorState";
import { UpgradeState } from "./UpgradeState";

interface AsyncViewProps<T> {
  state: AsyncState<T> & { retry: () => void };
  loading: ReactNode;
  children: (data: T) => ReactNode;
}

/** Os 3 estados obrigatórios (loading/erro/dados) num único lugar — nenhuma tela fica em branco. */
export function AsyncView<T>({ state, loading, children }: AsyncViewProps<T>) {
  if (state.status === "loading") return <>{loading}</>;
  if (state.status === "error") {
    if (state.code === "PRO_REQUIRED" && state.upgradeUrl) {
      return <UpgradeState message={state.error} upgradeUrl={state.upgradeUrl} />;
    }
    return <ErrorState message={state.error} onRetry={state.retry} />;
  }
  return <>{children(state.data)}</>;
}
