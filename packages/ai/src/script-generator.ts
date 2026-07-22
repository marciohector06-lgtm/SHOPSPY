import { callGeminiJson, GeminiUnavailableError } from "./gemini";

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
