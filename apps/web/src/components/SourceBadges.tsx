import type { ExternalIds } from "@shopspy/shared";

const PLATFORM_LABELS: Record<keyof ExternalIds, string> = {
  shopee: "Shopee",
  tiktokShop: "TikTok Shop BR",
  mercadoLivre: "Mercado Livre",
  tiktokShopUS: "TikTok Shop US",
  amazonUS: "Amazon US",
  amazonUK: "Amazon UK",
  aliexpress: "AliExpress",
  // Não é marketplace — é só o sinal de tendência do TikTok Creative Center,
  // por isso o rótulo evita confundir com TikTok Shop (que é venda real).
  tiktokCreative: "TikTok (tendência)",
};

/** Mostra de qual(is) plataforma(s) um produto foi coletado (Product.externalIds). */
export function SourceBadges({ externalIds }: { externalIds: ExternalIds | null | undefined }) {
  if (!externalIds) return null;

  const platforms = (Object.keys(PLATFORM_LABELS) as Array<keyof ExternalIds>).filter((key) => externalIds[key]);
  if (platforms.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {platforms.map((platform) => (
        <span
          key={platform}
          className="rounded-full bg-spy-surface px-1.5 py-0.5 font-data text-xs text-spy-muted ring-1 ring-inset ring-spy-border"
        >
          {PLATFORM_LABELS[platform]}
        </span>
      ))}
    </div>
  );
}
