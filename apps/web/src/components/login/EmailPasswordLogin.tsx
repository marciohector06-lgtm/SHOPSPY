"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WarningIcon } from "../icons";

const INPUT_CLASS =
  "h-11 rounded-lg border border-brand-border bg-brand-surface px-3 text-sm text-ink-primary outline-none transition-colors focus:border-brand-primary/60";

export function EmailPasswordLogin() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 flex min-h-11 w-full items-center justify-center text-center text-xs text-ink-muted transition-colors hover:text-ink-secondary"
      >
        Entrar com email →
      </button>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? "Email ou senha incorretos.");
        return;
      }

      router.push("/explorar");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-xs text-ink-muted">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-xs text-ink-muted">
          Senha
        </label>
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <WarningIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-lg bg-brand-primary px-4 text-sm font-medium text-white transition-colors hover:bg-brand-glow disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
