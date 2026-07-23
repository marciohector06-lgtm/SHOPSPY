import { LogoMark } from "../icons";
import { RegisterForm } from "./RegisterForm";

export function RegisterCard() {
  return (
    <div className="w-full max-w-[400px] rounded-3xl border border-brand-primary/20 bg-[rgba(15,17,23,0.85)] px-10 py-12 shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_24px_48px_rgba(0,0,0,0.4),0_0_80px_rgba(99,102,241,0.08)] backdrop-blur-xl transition-shadow duration-300 ease-out hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_24px_48px_rgba(0,0,0,0.45),0_0_100px_rgba(99,102,241,0.12)]">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <LogoMark className="h-9 w-9 text-brand-primary" />
        <p className="font-display text-lg font-bold text-ink-primary">ShopSpy</p>
        <p className="font-data text-[11px] uppercase tracking-[0.1em] text-ink-muted">
          Inteligência de Mercado BR + Global
        </p>
      </div>

      <div className="my-6 h-px w-full bg-brand-border" />

      <p className="text-center text-[0.9rem] text-ink-secondary">Crie sua conta para começar</p>

      <RegisterForm />

      <p className="mt-6 text-center text-xs text-ink-muted">
        Já tenho conta?{" "}
        <a href="/login" className="font-medium text-brand-glow hover:text-brand-primary">
          Entrar →
        </a>
      </p>
    </div>
  );
}
