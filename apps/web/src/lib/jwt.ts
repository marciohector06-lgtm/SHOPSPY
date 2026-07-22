import { jwtVerify } from "jose";
import type { Plan } from "@shopspy/shared";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  plan: Plan;
  name: string | null;
  avatarUrl: string | null;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET não configurada");
  return new TextEncoder().encode(secret);
}

/** Usado no middleware (Edge) e no layout (Server Component) — nunca no client. Retorna null em qualquer falha. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      plan: payload.plan as Plan,
      name: (payload.name as string | null) ?? null,
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
