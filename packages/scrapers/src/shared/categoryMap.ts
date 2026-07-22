import type { Category } from "@shopspy/shared";

/**
 * Termos de busca em PT-BR usados para varrer cada categoria nas plataformas
 * que não expõem uma taxonomia de categorias estável via API pública
 * (Shopee, TikTok Shop). Cada scraper itera este mapa em vez de IDs de
 * categoria específicos da plataforma.
 */
export const CATEGORY_SEARCH_TERMS: Record<Category, string[]> = {
  BEAUTY_SKINCARE: ["skincare facial", "sérum facial", "protetor solar facial"],
  MAKEUP: ["maquiagem", "batom", "base facial"],
  HAIR_CARE: ["escova alisadora", "óleo capilar", "creme para cabelo"],
  FASHION_WOMEN: ["vestido feminino", "blusa feminina"],
  FASHION_MEN: ["camisa masculina", "bermuda masculina"],
  ACCESSORIES: ["colar feminino", "óculos de sol"],
  HOME_CLEANING: ["produto de limpeza", "esponja multiuso"],
  HOME_ORGANIZATION: ["organizador de gaveta", "caixa organizadora"],
  HOME_DECOR: ["decoração para casa", "luminária led"],
  KITCHEN: ["utensílio de cozinha", "organizador de cozinha"],
  FITNESS: ["acessório de academia", "faixa elástica"],
  ELECTRONICS_GADGETS: ["gadget eletrônico", "fone de ouvido"],
  SUPPLEMENTS: ["suplemento alimentar", "vitamina em cápsula"],
  PETS: ["acessório para pet", "brinquedo para cachorro"],
  OTHER: ["produto viral tiktok"],
};
