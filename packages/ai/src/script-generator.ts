import { callGeminiJson, streamGeminiText, GeminiUnavailableError } from "./gemini";

interface ScriptSection {
  text: string;
  visual: string;
  duration: string;
}

export interface UGCScript {
  hook: ScriptSection;
  problem: ScriptSection;
  product: ScriptSection;
  proof: ScriptSection;
  cta: ScriptSection;
  flowPrompts: string[];
  hashtags: string[];
}

export interface UGCScriptInput {
  name: string;
  priceBR: number | null;
  commissionValueBR: number | null;
  ratingBR: number | null;
  soldCountBR: number | null;
}

const EMPTY_SECTION = (duration: string): ScriptSection => ({ text: "", visual: "", duration });

const FALLBACK: UGCScript = {
  hook: EMPTY_SECTION("0-3s"),
  problem: EMPTY_SECTION("3-8s"),
  product: EMPTY_SECTION("8-18s"),
  proof: EMPTY_SECTION("18-28s"),
  cta: EMPTY_SECTION("28-35s"),
  flowPrompts: [],
  hashtags: [],
};

const SECTION_SCHEMA = {
  type: "object",
  properties: { text: { type: "string" }, visual: { type: "string" }, duration: { type: "string" } },
  required: ["text", "visual", "duration"],
};

const SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    hook: SECTION_SCHEMA,
    problem: SECTION_SCHEMA,
    product: SECTION_SCHEMA,
    proof: SECTION_SCHEMA,
    cta: SECTION_SCHEMA,
    flowPrompts: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } },
  },
  required: ["hook", "problem", "product", "proof", "cta", "flowPrompts", "hashtags"],
};

/**
 * Gera um roteiro UGC de 30-35s (avatar não aparece) para afiliado TikTok
 * Shop BR. Fallback: roteiro vazio com as durações padrão, nunca quebra.
 */
export async function generateUGCScript(input: UGCScriptInput): Promise<UGCScript> {
  try {
    const facts = `${input.name} | R$${input.priceBR ?? "?"} | comissão R$${input.commissionValueBR ?? "?"} | ${input.ratingBR ?? "?"}★ | ${input.soldCountBR ?? "?"} vendidos`;
    return await callGeminiJson<UGCScript>({
      namespace: "ugc-script",
      cacheInput: input,
      prompt: `Roteiro UGC 30-35s para afiliado TikTok Shop BR, avatar não aparece (só mãos/reação), tom natural de indicação, CTA no fim. Produto: ${facts}. Seções: hook(0-3s) problem(3-8s) product(8-18s) proof(18-28s) cta(28-35s). Inclua 4 flowPrompts e 5 hashtags.`,
      responseSchema: SCRIPT_SCHEMA,
    });
  } catch (error) {
    if (error instanceof GeminiUnavailableError) return FALLBACK;
    throw error;
  }
}

/**
 * Marcadores de seção usados tanto no prompt quanto no parser do frontend
 * (apps/web/src/components/UGCScriptModal.tsx) — mudar aqui exige mudar lá.
 */
export const SCRIPT_STREAM_SECTION_MARKERS = ["HOOK", "PROBLEMA", "PRODUTO", "PROVA", "CTA", "PROMPTS FLOW"] as const;

function scriptPrompt(input: UGCScriptInput): string {
  const facts = `${input.name} | R$${input.priceBR ?? "?"} | comissão R$${input.commissionValueBR ?? "?"} | ${input.ratingBR ?? "?"}★ | ${input.soldCountBR ?? "?"} vendidos`;
  return `Roteiro UGC 30-35s para afiliado TikTok Shop BR, avatar não aparece (só mãos/reação), tom natural de indicação, CTA no fim. Produto: ${facts}. Escreva em texto corrido (não JSON) com as seções HOOK (0-3s), PROBLEMA (3-8s), PRODUTO (8-18s), PROVA (18-28s) e CTA (28-35s), cada uma com o texto a ser falado. Ao final, adicione uma seção PROMPTS FLOW com exatamente 4 prompts (um por linha, sem numeração) em inglês para recriar esse estilo de vídeo no Google Flow/Veo.`;
}

/**
 * Mesmo roteiro de `generateUGCScript`, mas em streaming — pensado para o
 * endpoint GET /products/:id/script mostrar o texto sendo gerado em tempo
 * real em vez de um loading de vários segundos. Texto livre, não JSON: um
 * schema estruturado forçaria esperar o objeto inteiro fechar para ser útil.
 */
export async function* streamUGCScript(input: UGCScriptInput): AsyncGenerator<string> {
  try {
    for await (const chunk of streamGeminiText(scriptPrompt(input))) {
      yield chunk;
    }
  } catch (error) {
    if (error instanceof GeminiUnavailableError) {
      yield "Roteiro indisponível: configure GEMINI_API_KEY para gerar em tempo real.";
      return;
    }
    throw error;
  }
}
