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

const MATCH_SCORE_SCHEMA = {
  type: "object",
  properties: { index: { type: "integer" }, similarity: { type: "number" } },
  required: ["index", "similarity"],
};

/**
 * Mesma ideia de findSemanticMatch, mas devolve o score (0-1) junto — usado
 * onde precisamos aplicar um threshold explícito (ex.: fallback Mercado
 * Livre em br-product-matcher.ts, que só aceita similarity > 0.7) em vez de
 * confiar só no julgamento interno do prompt de "-1 se nenhum for parecido".
 */
export async function findSemanticMatchWithScore(
  productEn: string,
  productsBR: string[]
): Promise<{ index: number; similarity: number }> {
  if (productsBR.length === 0) return { index: -1, similarity: 0 };

  try {
    const list = productsBR.map((p, i) => `${i}:${p}`).join("|");
    const result = await callGeminiJson<{ index: number; similarity: number }>({
      namespace: "semantic-match-score",
      cacheInput: { productEn, productsBR },
      prompt: `Produto: "${productEn}". Candidatos (índice:nome): ${list}. Responda o índice do candidato mais similar e um score de similaridade de 0 a 1 (1 = mesmo produto, 0 = nada a ver). Se nenhum candidato for parecido, responda index -1 e similarity 0.`,
      responseSchema: MATCH_SCORE_SCHEMA,
    });
    const index = result.index >= 0 && result.index < productsBR.length ? result.index : -1;
    return { index, similarity: result.similarity };
  } catch (error) {
    if (error instanceof GeminiUnavailableError) return { index: -1, similarity: 0 };
    throw error;
  }
}
