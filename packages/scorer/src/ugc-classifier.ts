import type { Category } from "@shopspy/shared";

export type UGCDifficulty = "easy" | "medium" | "hard";

export interface UGCClassification {
  difficulty: UGCDifficulty;
  score: number; // 0-100, usado como scoreUGC no engine
}

// Categorias cujo produto normalmente exige alguém vestindo/usando para
// converter, mesmo sem nenhuma palavra-chave especial no nome.
const CATEGORY_UGC_SCORE: Record<Category, number> = {
  HOME_CLEANING: 95,
  HOME_ORGANIZATION: 92,
  ELECTRONICS_GADGETS: 90,
  KITCHEN: 88,
  HOME_DECOR: 85,
  PETS: 80,
  ACCESSORIES: 78,
  HAIR_CARE: 70,
  SUPPLEMENTS: 70,
  FITNESS: 72,
  BEAUTY_SKINCARE: 75,
  MAKEUP: 65,
  OTHER: 60,
  FASHION_WOMEN: 45,
  FASHION_MEN: 45,
};

// Independente da categoria, esses termos no nome exigem alguém vestindo o
// produto para o vídeo converter — força 'hard' mesmo em categorias com
// score base mais alto (ex.: ACCESSORIES normalmente é fácil, mas não com
// esses termos).
const HARD_KEYWORDS = [
  "biquíni",
  "biquini",
  "lingerie",
  "calcinha",
  "sutiã",
  "sutia",
  "maiô",
  "maio",
  "cueca",
];

/**
 * Classifica a facilidade de criar UGC sem o criador aparecer. Categoria
 * define o padrão, mas palavras-chave no nome do produto têm prioridade —
 * um FASHION_WOMEN genérico já é 'hard' (45), mas um "biquíni" precisa
 * de alguém vestindo pra converter, então força 'hard' mesmo em categorias
 * com score base mais alto.
 */
export function classifyUGCDifficulty(name: string, category: Category): UGCClassification {
  const normalized = name.toLowerCase();
  const requiresWearing = HARD_KEYWORDS.some((keyword) => normalized.includes(keyword));
  if (requiresWearing) {
    return { difficulty: "hard", score: 20 };
  }

  const score = CATEGORY_UGC_SCORE[category] ?? 60;
  const difficulty: UGCDifficulty = score >= 90 ? "easy" : score >= 60 ? "medium" : "hard";
  return { difficulty, score };
}
