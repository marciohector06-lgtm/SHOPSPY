import { GoogleLoginButton } from "./GoogleLoginButton";
import { EmailPasswordLogin } from "./EmailPasswordLogin";
import { BoltIcon, LockIcon, LogoMark, MapPinIcon } from "../icons";

const TRUST_BADGES = [
  { Icon: LockIcon, label: "Dados seguros" },
  { Icon: BoltIcon, label: "Acesso imediato" },
  { Icon: MapPinIcon, label: "Foco no Brasil" },
];

const FREE_PLAN_ITEMS = [
  "Top 3 oportunidades toda semana",
  "Acesso ao score de produtos",
  "Sem cartão de crédito",
];

export function LoginCard() {
  return (
    <div
      className="w-full max-w-[400px] rounded-3xl border border-brand-primary/20 bg-[rgba(15,17,23,0.85)] px-10 py-12 shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_24px_48px_rgba(0,0,0,0.4),0_0_80px_rgba(99,102,241,0.08)] backdrop-blur-xl transition-shadow duration-300 ease-out hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_24px_48px_rgba(0,0,0,0.45),0_0_100px_rgba(99,102,241,0.12)]"
    >
      <div className="flex flex-col items-center gap-1.5 text-center">
        <LogoMark className="h-9 w-9 text-brand-primary" />
        <p className="font-display text-lg font-bold text-ink-primary">ShopSpy</p>
        <p className="font-data text-[11px] uppercase tracking-[0.1em] text-ink-muted">
          Inteligência de Mercado BR + Global
        </p>
      </div>

      <div className="my-6 h-px w-full bg-brand-border" />

      <p className="text-center text-[0.9rem] text-ink-secondary">
        Entre para ver as oportunidades desta semana
      </p>

      <div className="mt-6">
        <GoogleLoginButton />
        <EmailPasswordLogin />
      </div>

      <div className="my-6 flex items-center gap-3 text-ink-muted">
        <div className="h-px flex-1 bg-brand-border" />
        <span className="text-xs">ou</span>
        <div className="h-px flex-1 bg-brand-border" />
      </div>

      <ul className="flex items-start justify-center gap-4 text-[11px] text-ink-muted">
        {TRUST_BADGES.map(({ Icon, label }) => (
          <li key={label} className="flex max-w-[80px] flex-col items-center gap-1 text-center">
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </li>
        ))}
      </ul>

      <div className="my-6 h-px w-full bg-brand-border" />

      <div className="rounded-[10px] border border-brand-success/15 bg-brand-success/5 px-4 py-3.5">
        <p className="font-data text-[11px] uppercase tracking-wide text-brand-success">
          Gratuito para começar
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-secondary">
          {FREE_PLAN_ITEMS.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Não tem conta?{" "}
        <a href="/register" className="font-medium text-brand-glow hover:text-brand-primary">
          Criar conta →
        </a>
      </p>
    </div>
  );
}
