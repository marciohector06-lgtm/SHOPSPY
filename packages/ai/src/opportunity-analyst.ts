import { callGeminiJson, GeminiUnavailableError } from "./gemini";

export interface OpportunityAnalysisInput {
  name: string;
  weeklyChangeUS: number;
  searchesBR: number | null;
  gap: number;
  commissionValueBR: number | null;
  soldCountBR: number | null;
  windowLabel: string | null;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: { summary: { type: "string" } },
  required: ["summary"],
};

/**
 * Gera um parágrafo curto (2-3 linhas) explicando por que o produto é
 * oportunidade. Fallback: string vazia, nunca quebra o pipeline.
 */
export async function analyzeOpportunity(input: OpportunityAnalysisInput): Promise<string> {
  try {
    const facts = `${input.name} | +${input.weeklyChangeUS}% EUA/semana | ${input.searchesBR ?? 0} buscas BR | gap ${input.gap} | comissão R$${input.commissionValueBR ?? "?"} | ${input.soldCountBR ?? 0} vendidos BR | janela ${input.windowLabel ?? "?"}`;
    const result = await callGeminiJson<{ summary: string }>({
      namespace: "opportunity-analyst",
      cacheInput: input,
      prompt: `Explique em 2-3 linhas, PT-BR, por que este produto é oportunidade para afiliados: ${facts}`,
      responseSchema: ANALYSIS_SCHEMA,
    });
    return result.summary;
  } catch (error) {
    if (error instanceof GeminiUnavailableError) return "";
    throw error;
  }
}
