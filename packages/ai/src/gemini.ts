import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";
import { cacheGet, cacheSet } from "./cache";
import { SlidingWindowRateLimiter } from "./rateLimiter";
import { parseJsonDefensive } from "./jsonParser";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const MAX_ATTEMPTS = 2;

// Fila interna compartilhada por todas as chamadas de IA do processo:
// no máximo 3 em voo (p-limit) e 15/min (free tier do Gemini).
const limit = pLimit(3);
const rateLimiter = new SlidingWindowRateLimiter(15);

export class GeminiUnavailableError extends Error {}

let client: GoogleGenAI | null | undefined;

function getClient(): GoogleGenAI {
  if (client === undefined) {
    const apiKey = process.env.GEMINI_API_KEY;
    client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }
  if (!client) throw new GeminiUnavailableError("GEMINI_API_KEY não configurada");
  return client;
}

export interface GeminiJsonCallOptions {
  /** Namespace curto da função chamadora (ex.: "hook-extractor") — vira parte da chave de cache. */
  namespace: string;
  /** Dado usado só para gerar o hash da chave de cache (não precisa ser o prompt inteiro). */
  cacheInput: unknown;
  prompt: string;
  responseSchema?: Record<string, unknown>;
}

function cacheKeyFor(namespace: string, cacheInput: unknown): string {
  const hash = createHash("sha256").update(JSON.stringify(cacheInput)).digest("hex");
  return `gemini:${namespace}:${hash}`;
}

async function runGeneration<T>(options: GeminiJsonCallOptions): Promise<T> {
  // getClient() primeiro: se não há API key configurada, falha rápido em vez
  // de consumir/esperar uma vaga da fila de rate limit por nada.
  const ai = getClient();
  await rateLimiter.waitForSlot();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: options.prompt,
    config: {
      responseMimeType: "application/json",
      ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
    },
  });

  const text = response.text;
  if (!text) throw new Error("Resposta vazia do Gemini");
  return parseJsonDefensive<T>(text);
}

/**
 * Chamada genérica ao Gemini: JSON forçado, cache 24h por hash do input,
 * fila (3 simultâneas / 15 por minuto) e até 2 tentativas. Quem chama
 * decide o fallback de domínio (hook vazio, roteiro vazio...) capturando
 * GeminiUnavailableError — esta função nunca retorna um valor "vazio"
 * silenciosamente, para não mascarar falhas reais como sucesso.
 */
export async function callGeminiJson<T>(options: GeminiJsonCallOptions): Promise<T> {
  const cacheKey = cacheKeyFor(options.namespace, options.cacheInput);
  const cached = await cacheGet<T>(cacheKey);
  if (cached) return cached;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await limit(() => runGeneration<T>(options));
      await cacheSet(cacheKey, result, CACHE_TTL_SECONDS);
      return result;
    } catch (error) {
      lastError = error;
      if (error instanceof GeminiUnavailableError) break; // falha de config não se resolve tentando de novo
    }
  }

  throw new GeminiUnavailableError(
    `Gemini falhou após tentativas: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}
