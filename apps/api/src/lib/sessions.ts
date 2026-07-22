import { randomBytes } from "node:crypto";
import { prisma } from "@shopspy/database";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export interface CreateSessionInput {
  userId: string;
  userAgent?: string;
  ip?: string;
}

export async function createSession(input: CreateSessionInput): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.session.create({
    data: { userId: input.userId, token, expiresAt, userAgent: input.userAgent, ip: input.ip },
  });

  return { token, expiresAt };
}

/** Retorna a sessão só se o refresh token existir E ainda não tiver expirado. */
export async function findValidSession(token: string) {
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}
