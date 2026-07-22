import { callGeminiJson, GeminiUnavailableError } from "./gemini";

const TRANSLATION_SCHEMA = {
  type: "object",
  properties: { translation: { type: "string" } },
  required: ["translation"],
};

/**
 * Traduz um nome de produto (EN) para PT-BR natural, como apareceria numa loja.
 * Fallback: devolve o nome original em inglês (nunca quebra o pipeline).
 */
export async function translateProductNameToPT(nameEn: string): Promise<string> {
  try {
    const result = await callGeminiJson<{ translation: string }>({
      namespace: "translate-pt",
      cacheInput: nameEn,
      prompt: `Traduza para português do Brasil, minúsculas, natural de loja online: "${nameEn}"`,
      responseSchema: TRANSLATION_SCHEMA,
    });
    return result.translation;
  } catch (error) {
    if (error instanceof GeminiUnavailableError) return nameEn;
    throw error;
  }
}

const MATCH_SCHEMA = {
  type: "object",
  properties: { index: { type: "integer" } },
  required: ["index"],
};

/**
 * Encontra, entre `productsBR`, o índice do mais similar a `productEn`.
 * Retorna -1 se nenhum for similar o suficiente, ou em caso de falha do Gemini.
 */
export async function findSemanticMatch(
  productEn: string,
  productsBR: string[]
): Promise<number> {
  if (productsBR.length === 0) return -1;

  try {
    const list = productsBR.map((p, i) => `${i}:${p}`).join("|");
    const result = await callGeminiJson<{ index: number }>({
      namespace: "semantic-match",
      cacheInput: { productEn, productsBR },
      prompt: `Produto: "${productEn}". Candidatos (índice:nome): ${list}. Responda o índice do mais similar, ou -1 se nenhum for.`,
      responseSchema: MATCH_SCHEMA,
    });
    return result.index >= 0 && result.index < productsBR.length ? result.index : -1;
  } catch (error) {
    if (error instanceof GeminiUnavailableError) return -1;
    throw error;
  }
}
