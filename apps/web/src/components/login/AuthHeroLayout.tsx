import type { ReactNode } from "react";
import { HeroBackground } from "./HeroBackground";
import { AnimatedCounter } from "./AnimatedCounter";
import { MiniDashboard } from "./MiniDashboard";
import { Reveal } from "./Reveal";
import { LogoMark } from "../icons";

const METRICS = [
  { value: 11, label: "Fontes monitoradas" },
  { value: 204, label: "Testes aprovados" },
  { value: 500, label: "Usuários suportados" },
];

const HOW_IT_WORKS = [
  {
    title: "11 fontes, uma leitura só",
    body: "Amazon, AliExpress, Shopee BR, TikTok Shop BR/US, Google Trends e mais — tudo cruzado num único score.",
  },
  {
    title: "Gap Brasil x Global",
    body: "Detectamos produtos que já bombam lá fora e ainda não chegaram (ou não saturaram) por aqui.",
  },
  {
    title: "Roteiro UGC pronto",
    body: "Cada oportunidade de alto score já vem com um gancho de vídeo sugerido pra você gravar hoje.",
  },
];

/** Layout de duas colunas compartilhado por /login e /register — só o card da direita muda. */
export function AuthHeroLayout({ rightCard }: { rightCard: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-brand-bg">
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-2">
          <LogoMark className="h-5 w-5 text-brand-primary" />
          <span className="font-display text-base font-bold text-ink-primary">ShopSpy</span>
        </div>
        <a href="#saiba-mais" className="text-sm text-ink-secondary transition-colors hover:text-ink-primary">
          Saiba mais ↓
        </a>
      </nav>

      <div className="relative grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[3fr_2fr]">
        <HeroBackground />

        <section className="relative z-10 flex flex-col justify-center gap-8 px-6 py-12 sm:px-10 lg:py-0">
          <Reveal delayMs={100} className="flex flex-col gap-4">
            <h1
              className="font-display font-extrabold leading-[1.1] tracking-tight text-ink-primary"
              style={{ fontSize: "clamp(1.8rem, 5vw, 4rem)" }}
            >
              Descubra o próximo produto{" "}
              <span className="bg-gradient-to-r from-brand-primary to-brand-success bg-clip-text text-transparent">
                viral do Brasil
              </span>{" "}
              antes de todo mundo.
            </h1>
          </Reveal>

          <Reveal delayMs={250}>
            <p className="max-w-[520px] text-lg text-ink-secondary">
              O ShopSpy monitora 11 fontes globais e calcula em tempo real quais produtos vão
              explodir no TikTok Shop e Shopee BR nas próximas semanas — com roteiro UGC pronto
              para você gravar.
            </p>
          </Reveal>

          <Reveal
            delayMs={400}
            className="grid grid-cols-3 gap-x-4 gap-y-4 md:grid-cols-2 lg:flex lg:flex-nowrap lg:gap-0 lg:divide-x lg:divide-brand-border"
          >
            {METRICS.map((metric, i) => (
              <div key={metric.label} className="flex flex-col gap-0.5 lg:px-6 first:lg:pl-0">
                <span className="font-data text-2xl font-semibold text-ink-primary sm:text-3xl">
                  <AnimatedCounter value={metric.value} delayMs={400 + i * 100} />
                </span>
                <span className="text-xs text-ink-muted">{metric.label}</span>
              </div>
            ))}
          </Reveal>

          <div className="hidden lg:block">
            <Reveal delayMs={600}>
              <MiniDashboard />
            </Reveal>
          </div>
        </section>

        <section className="relative z-10 flex items-center justify-center px-6 py-12 sm:px-10 lg:py-0">
          <Reveal delayMs={800} from="right" className="w-full max-w-[400px]">
            {rightCard}
          </Reveal>
        </section>
      </div>

      <section id="saiba-mais" className="relative z-10 mx-auto max-w-4xl px-6 py-20 sm:px-10">
        <h2 className="font-display text-2xl font-bold text-ink-primary">Como o ShopSpy funciona</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.title} className="flex flex-col gap-2">
              <p className="font-display text-sm font-semibold text-brand-glow">{item.title}</p>
              <p className="text-sm text-ink-secondary">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 px-6 pb-10 text-center text-xs text-ink-muted sm:px-10">
        <a href="/privacy" className="hover:text-ink-secondary">
          Política de privacidade
        </a>
      </footer>
    </div>
  );
}
