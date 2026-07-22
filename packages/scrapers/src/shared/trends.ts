import googleTrends from "./googleTrendsClient";
import { cacheGet, cacheSet } from "./cache";

interface TimelinePoint {
  time: string;
  value: number[];
}

interface InterestOverTimeResponse {
  default: {
    timelineData: TimelinePoint[];
  };
}

export interface TrendsSummary {
  currentScore: number;
  weeklyChangePct: number;
  peakScore: number;
}

/** Pura: extrai score atual, variação semanal e pico histórico do JSON cru da lib. */
export function parseGoogleTrendsResponse(rawJson: string): TrendsSummary {
  const parsed = JSON.parse(rawJson) as InterestOverTimeResponse;
  const points = parsed.default.timelineData;

  if (points.length === 0) {
    return { currentScore: 0, weeklyChangePct: 0, peakScore: 0 };
  }

  const values = points.map((p) => p.value[0] ?? 0);
  const currentScore = values.at(-1) ?? 0;
  const previousScore = values.at(-2) ?? currentScore;
  const peakScore = Math.max(...values);

  const weeklyChangePct =
    previousScore === 0 ? (currentScore > 0 ? 100 : 0) : ((currentScore - previousScore) / previousScore) * 100;

  return { currentScore, weeklyChangePct, peakScore };
}

/** Divide uma lista em lotes de `size` — respeita o limite informal de requests simultâneos da lib. */
export function chunkKeywords<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Busca (com cache L2) o resumo de tendências de uma keyword numa região específica. */
export async function fetchTrendsSummary(keyword: string, geo: string): Promise<TrendsSummary> {
  const cacheKey = `trends:${geo}:${keyword}`;
  const cached = await cacheGet<TrendsSummary>(cacheKey);
  if (cached) return cached;

  const raw = await googleTrends.interestOverTime({
    keyword,
    geo,
    timeframe: "now 3-M",
  });
  const summary = parseGoogleTrendsResponse(raw);
  await cacheSet(cacheKey, summary, 6 * 60 * 60);
  return summary;
}
