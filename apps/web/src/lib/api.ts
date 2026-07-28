import type { Category, ProductStatus } from "@shopspy/shared";
import type {
  Alert,
  AlertsResponse,
  CategoryHeatmapEntry,
  CategoryTrendsResponse,
  DashboardSummary,
  HealthResponse,
  OpportunitiesTopResponse,
  ProductDetail,
  ProductsPage,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    /** Código de erro estruturado da API (ex.: "PRO_REQUIRED") — usado pra decidir que UI mostrar, não só um retry genérico. */
    public readonly code?: string,
    public readonly upgradeUrl?: string
  ) {
    super(message);
  }
}

/**
 * `token`, quando passado, vira "Authorization: Bearer" — necessário pra
 * Server Components (Node.js, sem o cookie jar do browser); no client,
 * `credentials:"include"` já basta e `token` fica de fora.
 */
async function fetchJson<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  let response: Response;
  try {
    // credentials:"include" é o que faz o cookie httpOnly de sessão viajar
    // até a API (domínios diferentes em produção, mesma "host" em dev).
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...init?.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new ApiError("Não foi possível conectar à API. Verifique sua conexão e tente novamente.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 403 && body?.error === "PRO_REQUIRED") {
      throw new ApiError("Esse recurso é exclusivo do plano PRO.", 403, "PRO_REQUIRED", body.upgradeUrl);
    }
    if (response.status === 403 && body?.error === "ALERT_LIMIT_REACHED") {
      throw new ApiError("Limite de alertas atingido — faça upgrade para PRO.", 403, "ALERT_LIMIT_REACHED", body.upgradeUrl);
    }
    if (response.status === 401) {
      throw new ApiError("Sessão expirada — faça login novamente.", 401, "UNAUTHORIZED");
    }
    throw new ApiError(`A API respondeu com erro (${response.status}).`, response.status);
  }

  // 204 (ex.: DELETE /alerts/:id) não tem corpo — response.json() quebraria.
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export type ProductRegion = "BR" | "LATAM" | "ASIA" | "EUROPE" | "GLOBAL";

export interface FetchProductsParams {
  cursor?: string;
  limit?: number;
  category?: Category;
  status?: ProductStatus;
  /** Aba de país/região de /produtos — sem valor = "Todas". */
  region?: ProductRegion;
  /** Busca por nome (ILIKE) — quando presente, a API ignora cursor/limit e devolve no máximo 20 itens. */
  q?: string;
}

export function fetchProducts(params: FetchProductsParams = {}, token?: string): Promise<ProductsPage> {
  const search = new URLSearchParams();
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.category) search.set("category", params.category);
  if (params.status) search.set("status", params.status);
  if (params.region) search.set("region", params.region);
  if (params.q) search.set("q", params.q);

  const query = search.toString();
  return fetchJson<ProductsPage>(`/api/v1/products${query ? `?${query}` : ""}`, { cache: "no-store" }, token);
}

export function fetchProduct(id: string, token?: string): Promise<ProductDetail> {
  return fetchJson<ProductDetail>(`/api/v1/products/${id}`, { cache: "no-store" }, token);
}

export function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/v1/health", { cache: "no-store" });
}

export function fetchDashboardSummary(token?: string): Promise<DashboardSummary> {
  return fetchJson<DashboardSummary>("/api/v1/dashboard/summary", { cache: "no-store" }, token);
}

export function fetchCategoryTrends(token?: string): Promise<CategoryTrendsResponse> {
  return fetchJson<CategoryTrendsResponse>("/api/v1/dashboard/category-trends", { cache: "no-store" }, token);
}

/** Heatmap por categoria pra um grupo regional (aba LATAM/Ásia/Europa/Global de /tendencias). */
export function fetchRegionalHeatmap(
  region: "LATAM" | "ASIA" | "EUROPE" | "GLOBAL",
  token?: string
): Promise<CategoryHeatmapEntry[]> {
  return fetchJson<CategoryHeatmapEntry[]>(
    `/api/v1/dashboard/regional-heatmap?region=${region}`,
    { cache: "no-store" },
    token
  );
}

/**
 * FREE recebe só o top 3 com `delayedAt` preenchido; PRO recebe tudo, em
 * tempo real (delayedAt: null). `filter: "new48h"` troca a ordenação por
 * semana pra "criado nas últimas 48h", limitado a 6. `filter:
 * "latam-opportunity"` retorna produtos altos no LATAM e ainda baixos no BR
 * (ver apps/api/src/routes/opportunities.ts).
 */
export function fetchTopOpportunities(
  params: { filter?: "new48h" | "latam-opportunity" } = {},
  token?: string
): Promise<OpportunitiesTopResponse> {
  const query = params.filter ? `?filter=${params.filter}` : "";
  return fetchJson<OpportunitiesTopResponse>(`/api/v1/opportunities/top${query}`, { cache: "no-store" }, token);
}

export function fetchAlerts(token?: string): Promise<AlertsResponse> {
  return fetchJson<AlertsResponse>("/api/v1/alerts", { cache: "no-store" }, token);
}

export interface CreateAlertParams {
  productId: string;
  threshold: number;
  channel: "email";
}

/** 201 = criado novo; 200 = já existia pro mesmo produto, threshold atualizado (dedupe no backend). */
export function createAlert(params: CreateAlertParams): Promise<Alert> {
  return fetchJson<Alert>("/api/v1/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export function toggleAlert(id: string): Promise<Alert> {
  return fetchJson<Alert>(`/api/v1/alerts/${id}/toggle`, { method: "PATCH" });
}

export function deleteAlert(id: string): Promise<void> {
  return fetchJson<void>(`/api/v1/alerts/${id}`, { method: "DELETE" });
}

export function streamUrl(): string {
  return `${API_BASE_URL}/api/v1/stream`;
}

/**
 * Gera o roteiro UGC em streaming: cada chunk de texto chega via callback
 * conforme o Gemini vai escrevendo, em vez de esperar a resposta inteira.
 */
export async function streamScript(
  productId: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/script`, { signal, credentials: "include" });
  if (!response.ok || !response.body) {
    throw new ApiError(`Falha ao gerar roteiro (${response.status}).`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
