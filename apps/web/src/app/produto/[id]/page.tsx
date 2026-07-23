import Link from "next/link";
import { fetchProduct } from "../../../lib/api";
import { getAccessTokenCookie, getCurrentUser } from "../../../lib/auth";
import { latestScore } from "../../../lib/product";
import { formatCategory } from "../../../lib/format";
import { ProductImage } from "../../../components/ProductImage";
import { ProductComparison } from "../../../components/ProductComparison";
import { ScoreHistoryChart } from "../../../components/ScoreHistoryChart";
import { ProductActionCard } from "../../../components/ProductActionCard";
import { VideoCard } from "../../../components/VideoCard";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { UpgradeState } from "../../../components/ui/UpgradeState";
import { ApiError } from "../../../lib/api";
import { PlayIcon } from "../../../components/icons";

export default async function ProdutoDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();

  if (!user || user.plan !== "PRO") {
    return (
      <UpgradeState
        message="O detalhe completo do produto é exclusivo do plano PRO."
        upgradeUrl="/pricing"
      />
    );
  }

  const token = getAccessTokenCookie();

  let product;
  try {
    product = await fetchProduct(params.id, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <EmptyState
          icon={<PlayIcon className="h-8 w-8" />}
          title="Produto não encontrado"
          message="Ele pode ter sido removido do monitoramento."
        />
      );
    }
    return <ErrorState message={error instanceof Error ? error.message : "Erro desconhecido."} />;
  }

  const score = latestScore(product);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/produtos" className="self-start text-xs font-medium text-spy-indigo-light hover:underline">
        ← Voltar pra produtos
      </Link>

      <div className="flex items-start gap-4">
        <ProductImage src={product.imageUrl} name={product.name} size={72} className="shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-lg font-semibold text-spy-text">{product.name}</h1>
          <span className="text-sm text-spy-muted">{formatCategory(product.category)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-semibold text-spy-text">Brasil x Global</h2>
            <ProductComparison product={product} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-semibold text-spy-text">Histórico de score</h2>
            <div className="rounded-lg border border-spy-border bg-spy-card p-4">
              <ScoreHistoryChart scores={product.scores} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-semibold text-spy-text">Vídeos de referência</h2>
            {product.videos.length === 0 ? (
              <EmptyState
                icon={<PlayIcon className="h-8 w-8" />}
                title="Vídeos de referência serão exibidos após a próxima coleta"
                message="Quando os dados chegarem em produção, aparecem automaticamente aqui."
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {product.videos.map((video) => (
                  <VideoCard key={video.id} video={video} productName={product.name} />
                ))}
              </div>
            )}
          </section>
        </div>

        <ProductActionCard product={product} score={score} />
      </div>
    </div>
  );
}
