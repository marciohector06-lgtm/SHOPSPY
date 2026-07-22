export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  BEAUTY_SKINCARE: "Beleza & Skincare",
  MAKEUP: "Maquiagem",
  HAIR_CARE: "Cuidados com Cabelo",
  FASHION_WOMEN: "Moda Feminina",
  FASHION_MEN: "Moda Masculina",
  ACCESSORIES: "Acessórios",
  HOME_CLEANING: "Limpeza",
  HOME_ORGANIZATION: "Organização",
  HOME_DECOR: "Decoração",
  KITCHEN: "Cozinha",
  FITNESS: "Fitness",
  ELECTRONICS_GADGETS: "Eletrônicos",
  SUPPLEMENTS: "Suplementos",
  PETS: "Pets",
  OTHER: "Outros",
};

export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
