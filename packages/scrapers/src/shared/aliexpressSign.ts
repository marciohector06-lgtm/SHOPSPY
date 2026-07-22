import { createHmac } from "node:crypto";

/**
 * Assinatura HMAC-SHA256 exigida pelo AliExpress Open Platform (TOP API,
 * sign_method=sha256): concatena chave1+valor1+chave2+valor2... com os
 * params ordenados alfabeticamente pela chave, e aplica HMAC-SHA256 (chave
 * = app_secret) em hex maiúsculo. Pura: não faz I/O, só monta e assina.
 */
export function signAliExpressRequest(
  params: Record<string, string>,
  appSecret: string
): string {
  const sortedKeys = Object.keys(params).sort();
  const concatenated = sortedKeys.map((key) => `${key}${params[key]}`).join("");
  return createHmac("sha256", appSecret).update(concatenated).digest("hex").toUpperCase();
}
