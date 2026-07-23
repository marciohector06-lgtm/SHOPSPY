import { Suspense } from "react";
import { fetchDashboardSummary, fetchHealth, fetchTopOpportunities } from "../../lib/api";
import { getAccessTokenCookie } from "../../lib/auth";
import { Skeleton, SkeletonProductCard, SkeletonProductRow, SkeletonVideoCard } from "../../components/ui/Skeleton";
import {
  BannerSection,
  CategoriesSection,
  CreatorsStubSection,
  New48hSection,
  ScraperStatusSection,
  SectionCard,
  TopProductsSection,
  VideosSection,
} from "./sections";

/**
 * Cada fetch começa aqui, em paralelo (nenhum `await` nesta função) — quem
 * de fato espera é o componente async de cada seção, dentro do seu próprio
 * <Suspense>. Assim o tempo total é o do fetch mais lento, não a soma, e
 * uma seção lenta não atrasa as outras na tela.
 */
export default function ExplorarPage() {
  const token = getAccessTokenCookie();
  const topOpportunitiesPromise = fetchTopOpportunities({}, token);
  const new48hPromise = fetchTopOpportunities({ filter: "new48h" }, token);
  const dashboardPromise = fetchDashboardSummary(token);
  const healthPromise = fetchHealth();

  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <BannerSection dataPromise={topOpportunitiesPromise} />
      </Suspense>

      <SectionCard title="Produtos mais bem pontuados">
        <Suspense
          fallback={
            <div className="overflow-hidden rounded-xl border border-spy-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonProductRow key={i} />
              ))}
            </div>
          }
        >
          <TopProductsSection dataPromise={topOpportunitiesPromise} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Oportunidades detectadas nas últimas 48h">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          }
        >
          <New48hSection dataPromise={new48hPromise} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Criadores">
        <CreatorsStubSection />
      </SectionCard>

      <SectionCard title="Vídeos de referência">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonVideoCard key={i} />
              ))}
            </div>
          }
        >
          <VideosSection dataPromise={topOpportunitiesPromise} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Categorias em alta">
        <Suspense
          fallback={
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-28 rounded-full" />
              ))}
            </div>
          }
        >
          <CategoriesSection dataPromise={dashboardPromise} />
        </Suspense>
      </SectionCard>

      <SectionCard title="Status dos scrapers">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))}
            </div>
          }
        >
          <ScraperStatusSection dataPromise={healthPromise} />
        </Suspense>
      </SectionCard>
    </div>
  );
}
