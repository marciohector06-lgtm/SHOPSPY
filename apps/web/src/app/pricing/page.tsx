import { CheckoutButton } from "../../components/CheckoutButton";

const FREE_FEATURES = [
  "Top 3 oportunidades da semana",
  "Dados com 48h de atraso",
  "Até 3 alertas configurados",
  "Dashboard geral (visão limitada)",
];

const PRO_FEATURES = [
  "Todas as oportunidades, em tempo real",
  "Sem atraso nos dados",
  "Alertas ilimitados",
  "Roteiros UGC com IA (streaming)",
  "Heatmap e tendências completas",
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-10 bg-zinc-950 px-4 py-16">
      <div className="text-center">
        <h1 className="font-mono text-xl font-semibold text-zinc-100">Planos</h1>
        <p className="mt-1 text-sm text-zinc-500">Escolha o plano certo pra encontrar a próxima oportunidade viral.</p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Free</h2>
            <p className="mt-1 font-mono text-3xl font-bold text-zinc-100">R$ 0</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-zinc-300">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="text-zinc-500">–</span>
                {feature}
              </li>
            ))}
          </ul>
          <span className="mt-auto rounded-md border border-zinc-700 px-4 py-2.5 text-center text-sm text-zinc-400">
            Plano atual ao criar conta
          </span>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-6 ring-1 ring-indigo-500/20">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-300">Pro</h2>
            <p className="mt-1 font-mono text-3xl font-bold text-zinc-100">
              R$ 47<span className="text-base font-normal text-zinc-500">/mês</span>
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-zinc-200">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="text-indigo-400">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-auto">
            <CheckoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
