import type { JSX, ReactNode } from "react";
import Link from "next/link";
import { ApiError } from "../../lib/api";
import type { DashboardSummary, HealthResponse, OpportunitiesTopResponse } from "../../lib/types";
import { OpportunityBanner } from "../../components/OpportunityBanner";
import { ProductRow } from "../../components/ProductRow";
import { ProductCard } from "../../components/ProductCard";
import { VideoCard } from "../../components/VideoCard";
import { CategoryChip } from "../../components/CategoryChip";
import { ScraperStatusDot } from "../../components/ScraperStatusDot";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { UpgradeState } from "../../components/ui/UpgradeState";
import { ClockIcon, PlayIcon, UsersIcon } from "../../components/icons";

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-sm font-semibold text-spy-text">{title}</h2>
      {children}
    </section>
  );
}

/** Erro/PRO_REQUIRED tratado por seção — uma seção falhando não derruba as outras. */
function sectionErrorFallback(error: unknown): JSX.Element {
  if (error instanceof ApiError && error.code === "PRO_REQUIRED") {
    return <UpgradeState message={error.message} upgradeUrl={error.upgradeUrl ?? "/pricing"} />;
  }
  return <ErrorState message={error instanceof Error ? error.message : "Erro desconhecido."} />;
}

export async function BannerSection({
  dataPromise,
}: {
  dataPromise: Promise<OpportunitiesTopResponse>;
}): Promise<JSX.Element> {
  try {
    const data = await dataPromise;
    const top = data.items[0];
    if (!top) {
      return <EmptyState icon={<ClockIcon className="h-8 w-8" />} title="Ainda sem oportunidade calculada" message="Aparece assim que o Score Calculator rodar." />;
    }
    return <OpportunityBanner product={top} />;
  } catch (error) {
    return sectionErrorFallback(error);
  }
}

const TOP_PRODUCTS_PREVIEW = 10;

export async function TopProductsSection({
  dataPromise,
}: {
  dataPromise: Promise<OpportunitiesTopResponse>;
}): Promise<JSX.Element> {
  try {
    const data = await dataPromise;
    if (data.items.length === 0) {
      return <EmptyState icon={<ClockIcon className="h-8 w-8" />} title="Nenhum produto pontuado ainda" message="Roda o Score Calculator para ver o ranking aqui." />;
    }
    return (
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-spy-border">
          {data.items.slice(0, TOP_PRODUCTS_PREVIEW).map((product, index) => (
            <ProductRow key={product.id} product={product} rank={index + 1} />
          ))}
        </div>
        {data.items.length > TOP_PRODUCTS_PREVIEW && (
          <Link
            href="/produtos"
            className="flex min-h-11 items-center self-end text-xs font-medium text-spy-indigo-light hover:underline"
          >
            Ver todos os {data.items.length} produtos →
          </Link>
        )}
      </div>
    );
  } catch (error) {
    return sectionErrorFallback(error);
  }
}

export async function New48hSection({
  dataPromise,
}: {
  dataPromise: Promise<OpportunitiesTopResponse>;
}): Promise<JSX.Element> {
  try {
    const data = await dataPromise;
    if (data.items.length === 0) {
      return (
        <EmptyState
          icon={<ClockIcon className="h-8 w-8" />}
          title="Nenhum produto novo nas últimas 48h"
          message="Os produtos aparecem aqui assim que a coleta encontra algo novo."
        />
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  } catch (error) {
    return sectionErrorFallback(error);
  }
}

export function CreatorsStubSection(): JSX.Element {
  return (
    <EmptyState
      icon={<UsersIcon className="h-8 w-8" />}
      title="Dados de criadores chegam em breve"
      message="Essa seção precisa de um scraper dedicado, ainda não implementado."
    />
  );
}

export async function VideosSection({
  dataPromise,
}: {
  dataPromise: Promise<OpportunitiesTopResponse>;
}): Promise<JSX.Element> {
  try {
    const data = await dataPromise;
    const videos = data.items
      .flatMap((product) => product.videos.map((video) => ({ video, productName: product.name })))
      .sort((a, b) => b.video.likes - a.video.likes)
      .slice(0, 6);

    if (videos.length === 0) {
      return (
        <EmptyState
          icon={<PlayIcon className="h-8 w-8" />}
          title="Vídeos de referência serão exibidos após a próxima coleta"
          message="Quando os dados chegarem em produção, aparecem automaticamente aqui."
        />
      );
    }
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {videos.map(({ video, productName }) => (
          <VideoCard key={video.id} video={video} productName={productName} />
        ))}
      </div>
    );
  } catch (error) {
    return sectionErrorFallback(error);
  }
}

export async function CategoriesSection({
  dataPromise,
}: {
  dataPromise: Promise<DashboardSummary>;
}): Promise<JSX.Element> {
  try {
    const data = await dataPromise;
    if (data.topCategories.length === 0) {
      return <EmptyState icon={<ClockIcon className="h-8 w-8" />} title="Sem categorias pontuadas ainda" message="Aparece assim que houver score suficiente por categoria." />;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {data.topCategories.map((entry) => (
          <CategoryChip key={entry.category} category={entry.category} averageScore={entry.averageScore} />
        ))}
      </div>
    );
  } catch (error) {
    return sectionErrorFallback(error);
  }
}

export async function ScraperStatusSection({
  dataPromise,
}: {
  dataPromise: Promise<HealthResponse>;
}): Promise<JSX.Element> {
  try {
    const data = await dataPromise;
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.scrapers.map((entry) => (
          <ScraperStatusDot key={entry.source} entry={entry} />
        ))}
      </div>
    );
  } catch (error) {
    return sectionErrorFallback(error);
  }
}
