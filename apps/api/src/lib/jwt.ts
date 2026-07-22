import { jwtVerify, SignJWT, errors } from "jose";
import type { Plan } from "@shopspy/database";

const ACCESS_TOKEN_TTL = "1h";

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

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, plan: payload.plan, name: payload.name, avatarUrl: payload.avatarUrl })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret());
}

export class AccessTokenExpiredError extends Error {}

/** Lança AccessTokenExpiredError especificamente — authMiddleware usa isso pra decidir se tenta o refresh automático. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      plan: payload.plan as Plan,
      name: (payload.name as string | null) ?? null,
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired) throw new AccessTokenExpiredError();
    throw error;
  }
}
