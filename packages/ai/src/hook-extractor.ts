import { callGeminiJson, GeminiUnavailableError } from "./gemini";

export type HookType = "emotional" | "social_proof" | "curiosity" | "pov" | "before_after" | "price";

export interface HookData {
  hook: string;
  hookType: HookType | null;
  visualAction: string;
  ugcFriendly: boolean;
}

const FALLBACK: HookData = { hook: "", hookType: null, visualAction: "", ugcFriendly: false };

const HOOK_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    hookType: {
      type: "string",
      enum: ["emotional", "social_proof", "curiosity", "pov", "before_after", "price"],
    },
    visualAction: { type: "string" },
    ugcFriendly: { type: "boolean" },
  },
  required: ["hook", "hookType", "visualAction", "ugcFriendly"],
};

/**
 * Extrai o gancho dos 3s iniciais de um vídeo TikTok a partir de
 * título/descrição. Fallback: campos vazios, nunca quebra o pipeline.
 */
export async function extractHook(videoTitle: string, videoDesc: string): Promise<HookData> {
  try {
    return await callGeminiJson<HookData>({
      namespace: "hook-extractor",
      cacheInput: { videoTitle, videoDesc },
      prompt: `Vídeo TikTok. Título: "${videoTitle}". Descrição: "${videoDesc}". Extraia o gancho dos 3s iniciais em PT-BR, classifique o tipo, descreva a ação visual e diga se é fácil de recriar em UGC sem aparecer.`,
      responseSchema: HOOK_SCHEMA,
    });
  } catch (error) {
    if (error instanceof GeminiUnavailableError) return FALLBACK;
    throw error;
  }
}
