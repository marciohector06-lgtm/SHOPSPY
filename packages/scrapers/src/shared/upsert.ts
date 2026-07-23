import { prisma } from "@shopspy/database";
import { normalizeProductName, type ExternalIds } from "@shopspy/shared";
import type { ParsedBRProduct, ParsedGlobalProduct } from "./types";

/**
 * Cria ou atualiza um Product a partir do resultado de um scraper BR.
 * Deduplicação por (nameNormalized, category) — o mesmo produto anunciado
 * em fontes diferentes (Shopee, TikTok Shop, ML) deve virar uma única linha,
 * com os externalIds de cada plataforma mesclados.
 */
export async function upsertProductFromBR(
  parsed: ParsedBRProduct
): Promise<{ created: boolean }> {
  const nameNormalized = normalizeProductName(parsed.name);

  const existing = await prisma.product.findFirst({
    where: { nameNormalized, category: parsed.category },
  });

  const brFields = {
    priceBR: parsed.priceBR,
    commissionPctBR: parsed.commissionPctBR,
    commissionValueBR: parsed.commissionValueBR,
    soldCountBR: parsed.soldCountBR,
    ratingBR: parsed.ratingBR,
    searchesBR: parsed.searchesBR,
    creatorVideosBR: parsed.creatorVideosBR,
  };

  if (existing) {
    const externalIds = {
      ...((existing.externalIds as ExternalIds | null) ?? {}),
      [parsed.platform]: parsed.externalId,
    };

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...brFields,
        externalIds,
        imageUrl: parsed.imageUrl ?? existing.imageUrl,
        firstSeenBR: existing.firstSeenBR ?? new Date(),
      },
    });
    return { created: false };
  }

  await prisma.product.create({
    data: {
      name: parsed.name,
      nameNormalized,
      category: parsed.category,
      imageUrl: parsed.imageUrl,
      externalIds: { [parsed.platform]: parsed.externalId } satisfies ExternalIds,
      firstSeenBR: new Date(),
      ...brFields,
    },
  });
  return { created: true };
}

/**
 * Cria ou atualiza um Product a partir do resultado de um scraper global
 * (TikTok Creative Center, TikTok Shop US, Amazon US/UK, AliExpress).
 * Não cria ProductMatch nem traduz o nome — isso depende do Gemini (Fase 4/5).
 */
export async function upsertProductFromGlobal(
  parsed: ParsedGlobalProduct
): Promise<{ created: boolean; productId: string }> {
  const nameNormalized = normalizeProductName(parsed.name);

  const existing = await prisma.product.findFirst({
    where: { nameNormalized, category: parsed.category },
  });

  const globalFields = {
    priceUS: parsed.priceUS,
    soldCountUS: parsed.soldCountUS,
    amazonRankUS: parsed.amazonRankUS,
    amazonRankUK: parsed.amazonRankUK,
    tiktokImpressions: parsed.tiktokImpressions,
    tiktokCTR: parsed.tiktokCTR,
  };

  if (existing) {
    const externalIds = {
      ...((existing.externalIds as ExternalIds | null) ?? {}),
      [parsed.platform]: parsed.externalId,
    };

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...globalFields,
        externalIds,
        imageUrl: existing.imageUrl ?? parsed.imageUrl,
        nameEn: existing.nameEn ?? parsed.name,
        firstSeenUS: existing.firstSeenUS ?? new Date(),
      },
    });
    return { created: false, productId: existing.id };
  }

  const product = await prisma.product.create({
    data: {
      name: parsed.name,
      nameEn: parsed.name,
      nameNormalized,
      category: parsed.category,
      imageUrl: parsed.imageUrl,
      externalIds: { [parsed.platform]: parsed.externalId } satisfies ExternalIds,
      firstSeenUS: new Date(),
      ...globalFields,
    },
  });
  return { created: true, productId: product.id };
}
