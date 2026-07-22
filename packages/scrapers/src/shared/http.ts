import axios, { AxiosRequestConfig } from "axios";
import { pickUserAgent } from "./userAgents";

export interface FetchOptions extends AxiosRequestConfig {
  retries?: number;
  retryDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET com rotação de User-Agent e retry com backoff exponencial.
 * Usado por todos os scrapers HTTP (Shopee, Mercado Livre).
 */
export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { retries = 3, retryDelayMs = 5000, headers, ...rest } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get<T>(url, {
        timeout: 10_000,
        ...rest,
        headers: {
          "User-Agent": pickUserAgent(),
          "Accept-Language": "pt-BR,pt;q=0.9",
          ...headers,
        },
      });
      return response.data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(retryDelayMs * 2 ** attempt);
      }
    }
  }

  throw lastError;
}
