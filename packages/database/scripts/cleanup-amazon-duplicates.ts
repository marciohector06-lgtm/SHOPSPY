/**
 * Limpeza one-off das duplicatas geradas pelo bug de triplicação da Amazon
 * (packages/scrapers/src/global/amazon-us.ts e amazon-uk.ts, corrigido para
 * usar groupCategoriesBySlug em vez de Object.keys(AMAZON_BESTSELLERS_SLUGS)).
 * Antes da correção, o mesmo ASIN da Amazon virava um Product por categoria
 * do grupo (ex.: BEAUTY_SKINCARE/MAKEUP/HAIR_CARE), porque
 * upsertProductFromGlobal dedupa por (nameNormalized, category).
 *
 * Esse mapa espelha a categoria "dona" que packages/scrapers/src/shared/amazonCategories.ts
 * (groupCategoriesBySlug) agora atribui a cada slug compartilhado — mantenha
 * os dois em sincronia se AMAZON_BESTSELLERS_SLUGS mudar.
 *
 * Uso:
 *   npx tsx packages/database/scripts/cleanup-amazon-duplicates.ts --dry-run
 *   npx tsx packages/database/scripts/cleanup-amazon-duplicates.ts
 */
import { PrismaClient, type Product } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_GROUPS: Record<string, string[]> = {
  BEAUTY_SKINCARE: ["BEAUTY_SKINCARE", "MAKEUP", "HAIR_CARE"],
  FASHION_WOMEN: ["FASHION_WOMEN", "FASHION_MEN", "ACCESSORIES"],
  HOME_CLEANING: ["HOME_CLEANING", "HOME_ORGANIZATION", "HOME_DECOR"],
};

const OWNER_BY_CATEGORY = new Map<string, string>();
for (const [owner, members] of Object.entries(CATEGORY_GROUPS)) {
  for (const member of members) OWNER_BY_CATEGORY.set(member, owner);
}

interface ExternalIds {
  amazonUS?: string;
  amazonUK?: string;
  [key: string]: string | undefined;
}

function groupKey(platform: "amazonUS" | "amazonUK", asin: string): string {
  return `${platform}:${asin}`;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const products = await prisma.product.findMany({
    where: {
      category: { in: [...OWNER_BY_CATEGORY.keys()] as Product["category"][] },
    },
  });

  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const externalIds = (product.externalIds as ExternalIds | null) ?? {};
    for (const platform of ["amazonUS", "amazonUK"] as const) {
      const asin = externalIds[platform];
      if (!asin) continue;
      const key = groupKey(platform, asin);
      const list = groups.get(key) ?? [];
      list.push(product);
      groups.set(key, list);
    }
  }

  let duplicateGroups = 0;
  let rowsToDelete = 0;
  const idsToDelete: string[] = [];
  const ambiguous: string[] = [];

  for (const [key, rows] of groups) {
    const distinctIds = [...new Map(rows.map((r) => [r.id, r])).values()];
    if (distinctIds.length < 2) continue;

    // Todas as linhas do grupo devem pertencer ao mesmo cluster de categorias
    // compartilhadas (ex.: beleza) — se não pertencerem, não mexe, só avisa.
    const owners = new Set(distinctIds.map((r) => OWNER_BY_CATEGORY.get(r.category)).filter(Boolean));
    if (owners.size !== 1) {
      ambiguous.push(`${key}: categorias inesperadas (${distinctIds.map((r) => r.category).join(", ")})`);
      continue;
    }
    const [ownerCategory] = owners;

    const keep = distinctIds.find((r) => r.category === ownerCategory) ?? distinctIds[0]!;
    const toDelete = distinctIds.filter((r) => r.id !== keep.id);
    if (toDelete.length === 0) continue;

    duplicateGroups++;
    rowsToDelete += toDelete.length;
    idsToDelete.push(...toDelete.map((r) => r.id));
  }

  const uniqueIdsToDelete = [...new Set(idsToDelete)];

  const affectedAlerts = uniqueIdsToDelete.length
    ? await prisma.alert.count({ where: { productId: { in: uniqueIdsToDelete } } })
    : 0;

  console.log(`Grupos de ASIN duplicado encontrados: ${duplicateGroups}`);
  console.log(`Linhas de Product a apagar: ${uniqueIdsToDelete.length}`);
  console.log(`Alerts de usuário afetados (cascade delete): ${affectedAlerts}`);
  if (ambiguous.length > 0) {
    console.log(`\nGrupos ambíguos (não mexidos, revisar manualmente): ${ambiguous.length}`);
    for (const line of ambiguous.slice(0, 20)) console.log(`  - ${line}`);
  }

  if (dryRun) {
    console.log("\n--dry-run: nenhuma linha apagada.");
    return;
  }

  if (uniqueIdsToDelete.length === 0) {
    console.log("\nNada para apagar.");
    return;
  }

  const result = await prisma.product.deleteMany({ where: { id: { in: uniqueIdsToDelete } } });
  console.log(`\nApagadas ${result.count} linhas de Product duplicadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
