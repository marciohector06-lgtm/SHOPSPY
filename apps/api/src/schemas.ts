import { z } from "zod";
import { ALERT_CHANNELS, CATEGORIES, PRODUCT_STATUSES } from "@shopspy/shared";

// Charset seguro de cuid — rejeita aspas, espaços, `;`, `--` etc. antes de
// qualquer coisa chegar ao Prisma (defesa em profundidade, o Prisma já
// parametriza tudo, mas um cursor mal formado nunca deve virar um 500).
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,40}$/;

export const idParamSchema = z.object({
  id: z.string().regex(ID_PATTERN, "deve ser um id válido (letras, números, _ e - apenas)"),
});

export const sourceParamSchema = z.object({
  source: z.string().regex(/^[A-Z_]{1,60}$/, "deve ser um código de fonte em MAIÚSCULAS (ex.: SHOPEE_BR)"),
});

export const productsListQuerySchema = z.object({
  cursor: z.string().regex(ID_PATTERN, "cursor inválido — use o id do último item da página anterior").optional(),
  limit: z.coerce
    .number({ message: "limit deve ser um número" })
    .int("limit deve ser um inteiro")
    .min(1, "limit mínimo é 1")
    .max(100, "limit máximo é 100")
    .default(20),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});

export type ProductsListQuery = z.infer<typeof productsListQuerySchema>;

export const createAlertSchema = z.object({
  productId: z.string().regex(ID_PATTERN, "productId inválido"),
  threshold: z.coerce
    .number({ message: "threshold deve ser um número" })
    .min(0, "threshold mínimo é 0")
    .max(100, "threshold máximo é 100"),
  channel: z.enum(ALERT_CHANNELS, { message: `channel deve ser um de: ${ALERT_CHANNELS.join(", ")}` }),
});

export type CreateAlertBody = z.infer<typeof createAlertSchema>;
