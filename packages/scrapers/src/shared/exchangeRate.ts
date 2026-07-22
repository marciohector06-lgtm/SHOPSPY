import axios from "axios";
import { cacheGet, cacheSet } from "./cache";

const CACHE_KEY = "exchange-rate:usd-brl";
const CACHE_TTL_SECONDS = 24 * 60 * 60;

interface ExchangeRateResponse {
  rates: Record<string, number>;
}

/** Busca a cotação USD->BRL (cache 24h). Retorna null se a API falhar — não deve travar o scraper. */
export async function fetchUsdToBrlRate(): Promise<number | null> {
  const cached = await cacheGet<number>(CACHE_KEY);
  if (cached) return cached;

  try {
    const url = process.env.EXCHANGE_RATE_API_URL ?? "https://api.exchangerate-api.com/v4/latest/USD";
    const { data } = await axios.get<ExchangeRateResponse>(url, { timeout: 8000 });
    const rate = data.rates.BRL;
    if (!rate) return null;

    await cacheSet(CACHE_KEY, rate, CACHE_TTL_SECONDS);
    return rate;
  } catch {
    return null;
  }
}

/** Pura: converte um preço em USD para BRL dada a cotação. */
export function convertUsdToBrl(usdPrice: number, rate: number): number {
  return Math.round(usdPrice * rate * 100) / 100;
}
