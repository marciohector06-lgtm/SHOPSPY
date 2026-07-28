import { callGeminiJson, GeminiUnavailableError } from "./gemini";

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: { index: { type: "integer" } },
  required: ["index"],
};

/**
 * Escolhe, entre `candidates` (packages/shared SUBCATEGORIES[category]), a
 * subcategoria mais provável pro nome de produto dado. Mesmo formato de
 * findSemanticMatch (packages/ai/src/keyword-normalizer.ts): índice da
 * lista, ou null se nenhuma servir/o Gemini estiver indisponível — nunca
 * lança, quem chama decide o que fazer sem classificação.
 */
export async function classifySubcategory(
  name: string,
  category: string,
  candidates: string[]
): Promise<string | null> {
  if (candidates.length === 0) return null;

  try {
    const list = candidates.map((c, i) => `${i}:${c}`).join("|");
    const result = await callGeminiJson<{ index: number }>({
      namespace: "subcategory-classifier",
      cacheInput: { name, category, candidates },
      prompt: `Produto: "${name}" (categoria: ${category}). Subcategorias possíveis (índice:nome): ${list}. Responda o índice da subcategoria mais apropriada, ou -1 se nenhuma servir.`,
      responseSchema: CLASSIFY_SCHEMA,
    });
    return result.index >= 0 && result.index < candidates.length ? candidates[result.index]! : null;
  } catch (error) {
    if (error instanceof GeminiUnavailableError) return null;
    throw error;
  }
}
