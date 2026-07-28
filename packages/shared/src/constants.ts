import type { Category } from "./types";

// Pesos do score principal (packages/scorer/src/engine.ts, Fase 5).
// Devem somar 1.0 — coberto por teste em tests/unit/constants.test.ts.
export const SCORE_WEIGHTS = {
  velocityUS: 0.3,
  gapBRGlobal: 0.25,
  commission: 0.2,
  socialProof: 0.15,
  ugcEase: 0.1,
} as const;

export const GLOBAL_TRENDS_WEIGHTS = {
  US: 0.4,
  UK: 0.25,
  AU: 0.2,
  CA: 0.15,
} as const;

// Nomes de cookie compartilhados entre a API (authMiddleware) e o frontend
// (Route Handler que grava, middleware que lê) — precisam ser idênticos
// dos dois lados pra sessão funcionar.
export const ACCESS_COOKIE_NAME = "shopspy_access";
export const REFRESH_COOKIE_NAME = "shopspy_refresh";

// Regiões internacionais monitoradas via TikTok Creative Center (Fase 3) e
// Google Trends internacional (Fase 4). O Creative Center serve a UI sempre
// em inglês (`/pc/en?region=${geo}`), então não há mapa de categorias por
// idioma — a categoria vem do mesmo `mapIndustryToCategory` usado por
// TIKTOK_CREATIVE_US.
export const INTERNATIONAL_REGIONS = {
  MX: { name: "México", currency: "MXN", group: "LATAM" },
  CO: { name: "Colômbia", currency: "COP", group: "LATAM" },
  AR: { name: "Argentina", currency: "ARS", group: "LATAM" },
  CL: { name: "Chile", currency: "CLP", group: "LATAM" },
  FR: { name: "França", currency: "EUR", group: "EUROPE" },
  DE: { name: "Alemanha", currency: "EUR", group: "EUROPE" },
  IT: { name: "Itália", currency: "EUR", group: "EUROPE" },
  TH: { name: "Tailândia", currency: "THB", group: "ASIA" },
  ID: { name: "Indonésia", currency: "IDR", group: "ASIA" },
  VN: { name: "Vietnã", currency: "VND", group: "ASIA" },
  JP: { name: "Japão", currency: "JPY", group: "ASIA" },
} as const;
export type InternationalRegion = keyof typeof INTERNATIONAL_REGIONS;

// Pesos para o score internacional ponderado (packages/scorer, Fase 4).
// Somam 1.0 entre as 11 regiões — Europa fica com peso 0 de propósito
// (monitoramento, sem influência no score, mesmo critério do spec original).
export const REGION_WEIGHTS: Record<InternationalRegion, number> = {
  MX: 0.27,
  CO: 0.18,
  AR: 0.11,
  CL: 0.11,
  TH: 0.11,
  ID: 0.09,
  VN: 0.07,
  JP: 0.06,
  FR: 0,
  DE: 0,
  IT: 0,
};

// Pesos específicos para o score LATAM (mais correlacionado com o BR).
export const LATAM_REGION_WEIGHTS: Record<"MX" | "CO" | "AR" | "CL", number> = {
  MX: 0.4,
  CO: 0.3,
  AR: 0.2,
  CL: 0.1,
};

// Pesos específicos para o score Ásia (mesma proporção relativa do REGION_WEIGHTS,
// reescalados pra somar 1.0 dentro do grupo).
export const ASIA_REGION_WEIGHTS: Record<"TH" | "ID" | "VN" | "JP", number> = {
  TH: 0.33,
  ID: 0.27,
  VN: 0.21,
  JP: 0.19,
};

// Europa é só monitoramento (peso 0 em REGION_WEIGHTS) — sem sinal de qual
// país pesa mais, então europeScore é uma média simples entre os 3.
export const EUROPE_REGION_WEIGHTS: Record<"FR" | "DE" | "IT", number> = {
  FR: 1 / 3,
  DE: 1 / 3,
  IT: 1 / 3,
};

// Crescimento semana-a-semana (%) acima do qual um RegionalScore é marcado
// como isExplosive (packages/scorer/src/explosive-detector.ts, Fase 5).
export const EXPLOSIVE_GROWTH_THRESHOLD = 200;

/**
 * Subcategorias por categoria — 2º nível da taxonomia, PT-BR, pensado pro
 * contexto de dropshipping/afiliado (mesmo espírito de CATEGORY_SEARCH_TERMS
 * em packages/scrapers/src/shared/categoryMap.ts). Nenhum scraper sabe
 * classificar nesse nível de detalhe — Product.subcategory é preenchido
 * depois, pelo job SUBCATEGORY_CLASSIFIER (packages/queue/src/subcategoryClassifier.ts,
 * via Gemini), escolhendo entre as opções daqui. Editar essa lista não exige
 * migration — é só uma constante, igual as outras tabelas de categoria.
 */
export const SUBCATEGORIES: Record<Category, string[]> = {
  BEAUTY_SKINCARE: ["Skincare facial", "Protetor solar", "Sérum e ácidos", "Hidratante corporal", "Ferramentas de beleza (rolo, LED)"],
  MAKEUP: ["Base e corretivo", "Batom e lip tint", "Olhos (sombra/máscara)", "Pincéis e acessórios", "Unhas"],
  HAIR_CARE: ["Shampoo e condicionador", "Óleos e finalizadores", "Ferramentas térmicas (chapinha/babyliss)", "Escovas e pentes", "Tratamentos capilares"],
  FASHION_WOMEN: ["Vestidos", "Blusas e camisetas", "Calças e shorts", "Conjuntos", "Moda praia", "Lingerie e moda íntima"],
  FASHION_MEN: ["Camisas e camisetas", "Calças e bermudas", "Jaquetas e moletons", "Roupa íntima", "Moda praia masculina"],
  ACCESSORIES: ["Bijuterias e joias", "Óculos de sol", "Bolsas e carteiras", "Cintos", "Relógios"],
  HOME_CLEANING: ["Produtos de limpeza", "Esponjas e panos", "Organizadores de limpeza", "Aspiradores e acessórios"],
  HOME_ORGANIZATION: ["Organizadores de gaveta", "Caixas e cestos", "Cabides e arara", "Organizador de armário"],
  HOME_DECOR: ["Iluminação e luminárias", "Quadros e posters", "Almofadas e mantas", "Vasos e plantas artificiais", "Aromatizadores"],
  KITCHEN: ["Utensílios de cozinha", "Potes e organizadores", "Eletroportáteis", "Copos e garrafas térmicas"],
  FITNESS: ["Acessórios de academia", "Roupa fitness", "Suporte e proteção", "Equipamentos de treino em casa"],
  ELECTRONICS_GADGETS: ["Fones de ouvido", "Acessórios para celular", "Carregadores e cabos", "Smartwatch e wearables", "Gadgets diversos"],
  SUPPLEMENTS: ["Vitaminas", "Proteínas e whey", "Emagrecedores", "Colágeno", "Termogênicos"],
  PETS: ["Brinquedos para pet", "Acessórios (coleira/guia)", "Higiene e cuidados", "Alimentação e comedouros"],
  OTHER: ["Diversos"],
};
