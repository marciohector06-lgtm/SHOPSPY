"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WarningIcon } from "../icons";

const INPUT_CLASS =
  "rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-ink-primary outline-none transition-colors focus:border-brand-primary/60";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível criar a conta.");
        return;
      }

      router.push("/opportunities");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="register-name" className="text-xs text-ink-muted">
          Nome completo
        </label>
        <input
          id="register-name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-email" className="text-xs text-ink-muted">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-password" className="text-xs text-ink-muted">
          Senha
        </label>
        <input
          id="register-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-confirm-password" className="text-xs text-ink-muted">
          Confirmar senha
        </label>
        <input
          id="register-confirm-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        className="mt-1 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-glow disabled:opacity-60"
      >
        {loading ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
