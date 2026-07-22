-- CreateEnum
CREATE TYPE "Category" AS ENUM ('BEAUTY_SKINCARE', 'MAKEUP', 'HAIR_CARE', 'FASHION_WOMEN', 'FASHION_MEN', 'ACCESSORIES', 'HOME_CLEANING', 'HOME_ORGANIZATION', 'HOME_DECOR', 'KITCHEN', 'FITNESS', 'ELECTRONICS_GADGETS', 'SUPPLEMENTS', 'PETS', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('MONITORING', 'OPPORTUNITY', 'TRENDING_BR', 'SATURATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScoreClass" AS ENUM ('MAXIMUM', 'HIGH', 'MEDIUM', 'SATURATING', 'AVOID');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "ScraperSource" AS ENUM ('GOOGLE_TRENDS_BR', 'GOOGLE_TRENDS_US', 'GOOGLE_TRENDS_UK', 'GOOGLE_TRENDS_AU', 'GOOGLE_TRENDS_CA', 'SHOPEE_BR', 'TIKTOK_SHOP_BR', 'MERCADOLIVRE_BR', 'TIKTOK_CREATIVE_US', 'TIKTOK_SHOP_US', 'AMAZON_US', 'AMAZON_UK', 'ALIEXPRESS_GLOBAL', 'VIDEOS_US', 'VIDEOS_BR');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "nameEn" TEXT,
    "category" "Category" NOT NULL,
    "subcategory" TEXT,
    "imageUrl" TEXT,
    "externalIds" JSONB NOT NULL,
    "priceBR" DOUBLE PRECISION,
    "commissionPctBR" DOUBLE PRECISION,
    "commissionValueBR" DOUBLE PRECISION,
    "soldCountBR" INTEGER,
    "ratingBR" DOUBLE PRECISION,
    "searchesBR" INTEGER,
    "creatorVideosBR" INTEGER,
    "priceUS" DOUBLE PRECISION,
    "soldCountUS" INTEGER,
    "amazonRankUS" INTEGER,
    "amazonRankUK" INTEGER,
    "tiktokImpressions" INTEGER,
    "tiktokCTR" DOUBLE PRECISION,
    "firstSeenUS" TIMESTAMP(3),
    "firstSeenBR" TIMESTAMP(3),
    "status" "ProductStatus" NOT NULL DEFAULT 'MONITORING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendScore" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "scoreTotal" DOUBLE PRECISION NOT NULL,
    "classification" "ScoreClass" NOT NULL,
    "scoreVelocityUS" DOUBLE PRECISION NOT NULL,
    "scoreGapBRUS" DOUBLE PRECISION NOT NULL,
    "scoreCommission" DOUBLE PRECISION NOT NULL,
    "scoreSocialProof" DOUBLE PRECISION NOT NULL,
    "scoreUGC" DOUBLE PRECISION NOT NULL,
    "trendsUS" DOUBLE PRECISION NOT NULL,
    "trendsBR" DOUBLE PRECISION NOT NULL,
    "trendsUK" DOUBLE PRECISION,
    "gap" DOUBLE PRECISION NOT NULL,
    "weeklyChangeUS" DOUBLE PRECISION NOT NULL,
    "weeklyChangeBR" DOUBLE PRECISION NOT NULL,
    "windowWeeks" INTEGER,
    "windowLabel" TEXT,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMatch" (
    "id" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "sourceRegion" TEXT NOT NULL,
    "matchedProductId" TEXT,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "matchMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceVideo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "platform" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "hook" TEXT,
    "hookType" TEXT,
    "scriptPt" TEXT,
    "ugcPrompt" TEXT,
    "hasUGCStyle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planExpiresAt" TIMESTAMP(3),
    "alertsUsed" INTEGER NOT NULL DEFAULT 0,
    "alertsLimit" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "channel" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "fireCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperLog" (
    "id" TEXT NOT NULL,
    "source" "ScraperSource" NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "itemsNew" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScraperLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_nameNormalized_idx" ON "Product"("nameNormalized");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "TrendScore_scoreTotal_idx" ON "TrendScore"("scoreTotal" DESC);

-- CreateIndex
CREATE INDEX "TrendScore_classification_idx" ON "TrendScore"("classification");

-- CreateIndex
CREATE INDEX "TrendScore_weekNumber_year_idx" ON "TrendScore"("weekNumber", "year");

-- CreateIndex
CREATE UNIQUE INDEX "TrendScore_productId_weekNumber_year_key" ON "TrendScore"("productId", "weekNumber", "year");

-- CreateIndex
CREATE INDEX "ProductMatch_sourceProductId_idx" ON "ProductMatch"("sourceProductId");

-- CreateIndex
CREATE INDEX "ProductMatch_matchedProductId_idx" ON "ProductMatch"("matchedProductId");

-- CreateIndex
CREATE INDEX "ReferenceVideo_productId_region_idx" ON "ReferenceVideo"("productId", "region");

-- CreateIndex
CREATE INDEX "ReferenceVideo_likes_idx" ON "ReferenceVideo"("likes" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_userId_productId_key" ON "Alert"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "ScraperLog_source_createdAt_idx" ON "ScraperLog"("source", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ScraperLog_status_idx" ON "ScraperLog"("status");

-- AddForeignKey
ALTER TABLE "TrendScore" ADD CONSTRAINT "TrendScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_matchedProductId_fkey" FOREIGN KEY ("matchedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceVideo" ADD CONSTRAINT "ReferenceVideo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
