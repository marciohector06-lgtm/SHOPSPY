import type { Category, ProductStatus } from "@shopspy/shared";
import type {
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
    if (response.status === 401) {
      throw new ApiError("Sessão expirada — faça login novamente.", 401, "UNAUTHORIZED");
    }
    throw new ApiError(`A API respondeu com erro (${response.status}).`, response.status);
  }

  return (await response.json()) as T;
}

export interface FetchProductsParams {
  cursor?: string;
  limit?: number;
  category?: Category;
  status?: ProductStatus;
}

export function fetchProducts(params: FetchProductsParams = {}, token?: string): Promise<ProductsPage> {
  const search = new URLSearchParams();
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.category) search.set("category", params.category);
  if (params.status) search.set("status", params.status);

  const query = search.toString();
  return fetchJson<ProductsPage>(`/api/v1/products${query ? `?${query}` : ""}`, { cache: "no-store" }, token);
}

export function fetchProduct(id: string): Promise<ProductDetail> {
  return fetchJson<ProductDetail>(`/api/v1/products/${id}`);
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

/**
 * FREE recebe só o top 3 com `delayedAt` preenchido; PRO recebe tudo, em
 * tempo real (delayedAt: null). `filter: "new48h"` troca a ordenação por
 * semana pra "criado nas últimas 48h", limitado a 6 (ver apps/api).
 */
export function fetchTopOpportunities(
  params: { filter?: "new48h" } = {},
  token?: string
): Promise<OpportunitiesTopResponse> {
  const query = params.filter ? `?filter=${params.filter}` : "";
  return fetchJson<OpportunitiesTopResponse>(`/api/v1/opportunities/top${query}`, { cache: "no-store" }, token);
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
