import type { Category, ProductStatus, ScoreClass } from "@shopspy/shared";

// Espelham a resposta da API (apps/api) — de propósito não importamos
// @shopspy/database aqui: o bundle do browser não deve carregar @prisma/client.

export interface Product {
  id: string;
  name: string;
  nameEn: string | null;
  category: Category;
  subcategory: string | null;
  imageUrl: string | null;
  status: ProductStatus;

  priceBR: number | null;
  commissionPctBR: number | null;
  commissionValueBR: number | null;
  soldCountBR: number | null;
  ratingBR: number | null;
  searchesBR: number | null;
  creatorVideosBR: number | null;

  priceUS: number | null;
  soldCountUS: number | null;
  amazonRankUS: number | null;
  amazonRankUK: number | null;
  tiktokImpressions: number | null;
  tiktokCTR: number | null;

  createdAt: string;
  updatedAt: string;
}

export interface ProductsPage {
  items: ProductDetail[];
  nextCursor: string | null;
}

export interface ProductDetail extends Product {
  scores: TrendScoreEntry[];
  videos: ReferenceVideo[];
}

export interface TrendScoreEntry {
  id: string;
  scoreTotal: number;
  classification: ScoreClass;
  trendsUS: number;
  trendsBR: number;
  gap: number;
  weeklyChangeUS: number;
  weeklyChangeBR: number;
  windowWeeks: number | null;
  windowLabel: string | null;
  weekNumber: number;
  year: number;
  createdAt: string;
}

export interface ReferenceVideo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  platform: string;
  region: string;
  likes: number;
  views: number;
  comments: number;
  shares: number;
  hook: string | null;
  hookType: string | null;
}

export interface ScraperStatusEntry {
  source: string;
  lastRun: { at: string; status: string; itemsFound: number } | null;
  nextRun: string | null;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  components: { database: "up" | "down"; redis: "up" | "down" };
  lastCycle: { cycleId: string; status: string; completedSources: number; totalSources: number };
  scrapers: ScraperStatusEntry[];
}

export interface TopOpportunity {
  productId: string;
  name: string;
  category: Category;
  commissionValueBR: number | null;
  scoreTotal: number;
  classification: ScoreClass;
  windowLabel: string | null;
}

export interface DashboardSummary {
  weekNumber: number;
  year: number;
  monitoredProducts: number;
  newProductsLast48h: number;
  alertsFiredToday: number;
  bestScoreThisWeek: number | null;
  topCategories: Array<{ category: Category; averageScore: number }>;
  topOpportunities: TopOpportunity[];
}

export interface CategoryHeatmapEntry {
  category: Category;
  averageScore: number | null;
}

export interface CategoryWeekPoint {
  week: string;
  avgTrendsBR: number | null;
  avgTrendsUS: number | null;
}

export interface CategoryTrendSeries {
  category: Category;
  series: CategoryWeekPoint[];
}

export interface CategoryTrendsResponse {
  weeks: string[];
  categories: CategoryTrendSeries[];
  heatmap: CategoryHeatmapEntry[];
}

/** Espelha ScraperStatusMessage (packages/queue/src/statusPublisher.ts) — payload recebido via SSE. */
export interface ScraperStatusMessage {
  source: string;
  region: string;
  state: "running" | "success" | "partial" | "error";
  itemsFound?: number;
  itemsTotal?: number;
  message?: string;
  timestamp: string;
}
