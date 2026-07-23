import { ScoreBar } from "../../components/ScoreBar";
import { OpportunityBadge } from "../../components/OpportunityBadge";
import { GapIndicator } from "../../components/GapIndicator";
import { WindowBadge } from "../../components/WindowBadge";
import { RankBadge } from "../../components/RankBadge";
import {
  Skeleton,
  SkeletonProductRow,
  SkeletonProductCard,
  SkeletonVideoCard,
  SkeletonCreatorCard,
} from "../../components/ui/Skeleton";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-spy-border pb-10">
      <h2 className="font-display text-lg font-bold text-spy-text">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-spy-border bg-spy-card p-4">
      <span className="w-40 shrink-0 text-xs text-spy-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </div>
  );
}

/** Sem autenticação de propósito — só uso interno de desenvolvimento, não faz parte do produto. */
export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-spy-base px-6 py-10 text-spy-text">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header>
          <h1 className="font-display text-2xl font-bold">🕵️ ShopSpy — Design System</h1>
          <p className="text-sm text-spy-muted">Componentes atômicos da Fase 2, todas as variações. Só dev, não requer login.</p>
        </header>

        <Section title="ScoreBar">
          <Row label="sm (sem número)">
            <ScoreBar score={30} size="sm" />
            <ScoreBar score={55} size="sm" />
            <ScoreBar score={72} size="sm" />
            <ScoreBar score={91} size="sm" />
          </Row>
          <Row label="md (padrão)">
            <ScoreBar score={30} size="md" />
            <ScoreBar score={55} size="md" />
            <ScoreBar score={72} size="md" />
            <ScoreBar score={91} size="md" />
          </Row>
          <Row label="lg (número + tier)">
            <ScoreBar score={30} size="lg" />
            <ScoreBar score={55} size="lg" />
            <ScoreBar score={72} size="lg" />
            <ScoreBar score={91} size="lg" />
          </Row>
        </Section>

        <Section title="OpportunityBadge">
          <Row label="5 classificações">
            <OpportunityBadge classification="MAXIMUM" />
            <OpportunityBadge classification="HIGH" />
            <OpportunityBadge classification="MEDIUM" />
            <OpportunityBadge classification="SATURATING" />
            <OpportunityBadge classification="AVOID" />
          </Row>
        </Section>

        <Section title="GapIndicator">
          <Row label="BR em coleta (0 ou null)">
            <GapIndicator globalScore={85} brScore={null} />
            <GapIndicator globalScore={85} brScore={0} />
          </Row>
          <Row label="Dado BR real">
            <GapIndicator globalScore={89} brScore={18} />
            <GapIndicator globalScore={60} brScore={45} />
            <GapIndicator globalScore={40} brScore={70} />
          </Row>
        </Section>

        <Section title="WindowBadge">
          <Row label="Sem confiança">
            <WindowBadge label="~3 semanas" />
          </Row>
          <Row label="Por confiança">
            <WindowBadge label="~3 semanas" confidence="high" />
            <WindowBadge label="1-2 meses" confidence="medium" />
            <WindowBadge label="~2 meses" confidence="low" />
          </Row>
          <Row label="Sem janela (chegou tarde)">
            <WindowBadge label={null} />
          </Row>
        </Section>

        <Section title="RankBadge">
          <Row label="Top 3 (metálico) + demais">
            <RankBadge position={1} />
            <RankBadge position={2} />
            <RankBadge position={3} />
            <RankBadge position={4} />
            <RankBadge position={10} />
          </Row>
        </Section>

        <Section title="Skeletons">
          <Row label="Base">
            <Skeleton className="h-8 w-32" />
          </Row>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-spy-muted">SkeletonProductRow (/produtos)</span>
            <div className="rounded-lg border border-spy-border">
              <SkeletonProductRow />
              <SkeletonProductRow />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-spy-muted">SkeletonProductCard (/oportunidades)</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonProductCard />
              <SkeletonProductCard />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-spy-muted">SkeletonVideoCard (/videos)</span>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SkeletonVideoCard />
              <SkeletonVideoCard />
              <SkeletonVideoCard />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-spy-muted">SkeletonCreatorCard (/criadores)</span>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SkeletonCreatorCard />
              <SkeletonCreatorCard />
              <SkeletonCreatorCard />
              <SkeletonCreatorCard />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
