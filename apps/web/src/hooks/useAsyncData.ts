"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: string; code?: string; upgradeUrl?: string }
  | { status: "success"; data: T };

/**
 * Padroniza os 3 estados visuais exigidos em toda tela que busca dados:
 * loading (skeleton), erro (mensagem + retry) e sucesso — nunca uma tela
 * em branco. `code`/`upgradeUrl` (de ApiError) deixam o chamador mostrar um
 * CTA de upgrade em vez de um retry genérico quando o erro é PRO_REQUIRED.
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError) {
          setState({ status: "error", error: error.message, code: error.code, upgradeUrl: error.upgradeUrl });
        } else {
          setState({ status: "error", error: error instanceof Error ? error.message : "Erro inesperado." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, ...deps]);

  return { ...state, retry };
}
