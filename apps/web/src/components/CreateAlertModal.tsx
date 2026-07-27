"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, createAlert, fetchAlerts } from "../lib/api";

interface CreateAlertModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_THRESHOLD = 75;

export function CreateAlertModal({ productId, productName, isOpen, onClose }: CreateAlertModalProps) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [usage, setUsage] = useState<{ used: number; limit: number | null } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setThreshold(DEFAULT_THRESHOLD);
    setError(null);
    setSuccess(false);
    setLoadingUsage(true);
    fetchAlerts()
      .then((res) => setUsage(res.usage))
      .catch(() => setUsage(null))
      .finally(() => setLoadingUsage(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const remaining = usage && usage.limit !== null ? usage.limit - usage.used : null;
  const limitReached = remaining !== null && remaining <= 0;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await createAlert({ productId, threshold, channel: "email" });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar alerta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-spy-border bg-spy-card p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-spy-text">Criar alerta — {productName}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-spy-muted hover:bg-spy-hover hover:text-spy-text"
          >
            ✕
          </button>
        </header>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-spy-high">
              Alerta criado! Você será notificado por e-mail quando o score ultrapassar {threshold}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-spy-indigo px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light"
            >
              Fechar
            </button>
          </div>
        ) : limitReached ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-spy-max">Limite de alertas atingido — faça upgrade para PRO.</p>
            <Link
              href="/pricing"
              className="rounded-md bg-spy-indigo px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light"
            >
              Assinar PRO
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="alert-threshold" className="text-xs text-spy-muted">
                Score mínimo pra disparar o alerta
              </label>
              <input
                id="alert-threshold"
                type="range"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-spy-indigo"
              />
              <span className="self-center text-2xl font-bold text-spy-indigo-light">{threshold}</span>
              <p className="text-center text-xs text-spy-muted">
                Você será notificado quando o score deste produto ultrapassar {threshold}.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-md bg-spy-surface px-3 py-2 text-xs">
              <span className="text-spy-muted">Canal</span>
              <span className="text-spy-text">E-mail</span>
            </div>

            {!loadingUsage && remaining !== null && (
              <p className="text-center text-xs text-spy-muted">
                {remaining} de {usage!.limit} alertas disponíveis
              </p>
            )}

            {error && <p className="text-center text-xs text-spy-max">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-md bg-spy-indigo px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light disabled:opacity-50"
            >
              {submitting ? "Criando…" : "Criar alerta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
