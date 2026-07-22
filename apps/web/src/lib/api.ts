import type { Category, ProductStatus } from "@shopspy/shared";
import type { CategoryTrendsResponse, DashboardSummary, HealthResponse, ProductDetail, ProductsPage } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError("Não foi possível conectar à API. Verifique sua conexão e tente novamente.");
  }

  if (!response.ok) {
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

export function fetchProducts(params: FetchProductsParams = {}): Promise<ProductsPage> {
  const search = new URLSearchParams();
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.limit) search.set("limit", String(params.limit));
  if (params.category) search.set("category", params.category);
  if (params.status) search.set("status", params.status);

  const query = search.toString();
  return fetchJson<ProductsPage>(`/api/v1/products${query ? `?${query}` : ""}`);
}

export function fetchProduct(id: string): Promise<ProductDetail> {
  return fetchJson<ProductDetail>(`/api/v1/products/${id}`);
}

export function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/v1/health", { cache: "no-store" });
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson<DashboardSummary>("/api/v1/dashboard/summary");
}

export function fetchCategoryTrends(): Promise<CategoryTrendsResponse> {
  return fetchJson<CategoryTrendsResponse>("/api/v1/dashboard/category-trends");
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
  const response = await fetch(`${API_BASE_URL}/api/v1/products/${productId}/script`, { signal });
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
