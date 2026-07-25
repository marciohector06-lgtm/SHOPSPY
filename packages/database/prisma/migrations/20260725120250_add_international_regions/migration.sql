-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_MX';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_CO';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_AR';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_CL';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_TH';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_ID';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_VN';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_JP';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_FR';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_DE';
ALTER TYPE "ScraperSource" ADD VALUE 'TIKTOK_CREATIVE_IT';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "asiaScore" DOUBLE PRECISION,
ADD COLUMN     "europeScore" DOUBLE PRECISION,
ADD COLUMN     "latamScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RegionalScore" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "trendScore" DOUBLE PRECISION NOT NULL,
    "weeklyGrowth" DOUBLE PRECISION NOT NULL,
    "isExplosive" BOOLEAN NOT NULL DEFAULT false,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionalScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegionalScore_region_trendScore_idx" ON "RegionalScore"("region", "trendScore" DESC);

-- CreateIndex
CREATE INDEX "RegionalScore_isExplosive_idx" ON "RegionalScore"("isExplosive");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalScore_productId_region_weekNumber_year_key" ON "RegionalScore"("productId", "region", "weekNumber", "year");

-- AddForeignKey
ALTER TABLE "RegionalScore" ADD CONSTRAINT "RegionalScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
