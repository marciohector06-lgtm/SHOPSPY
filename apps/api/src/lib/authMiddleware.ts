import type { NextFunction, Request, Response } from "express";
import type { Plan } from "@shopspy/database";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@shopspy/shared";
import { AccessTokenExpiredError, signAccessToken, verifyAccessToken } from "./jwt";
import { findValidSession } from "./sessions";

const ACCESS_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; plan: Plan };
    }
  }
}

const PLAN_RANK: Record<Plan, number> = { FREE: 0, PRO: 1 };

function extractAccessToken(req: Request): string | undefined {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return req.cookies?.[ACCESS_COOKIE_NAME];
}

function extractRefreshToken(req: Request): string | undefined {
  return req.cookies?.[REFRESH_COOKIE_NAME] ?? req.header("x-refresh-token") ?? undefined;
}

/**
 * Se o access token expirou mas o refresh token ainda é válido, renova
 * automaticamente e devolve o novo token no header X-New-Token — o
 * frontend detecta esse header e atualiza o cookie sem deslogar o usuário.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractAccessToken(req);
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const payload = await verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, plan: payload.plan };
    next();
    return;
  } catch (error) {
    if (!(error instanceof AccessTokenExpiredError)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
  }

  const refreshToken = extractRefreshToken(req);
  const session = refreshToken ? await findValidSession(refreshToken) : null;
  if (!session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const newToken = await signAccessToken({
    sub: session.user.id,
    email: session.user.email,
    plan: session.user.plan,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
  });

  // X-New-Token é o sinal explícito pro frontend saber que renovou (útil pra
  // clientes que guardam o token na memória/Authorization header). Como o
  // cookie é httpOnly, JS não consegue escrevê-lo a partir do header — por
  // isso também mandamos o Set-Cookie direto aqui, que o browser aplica
  // sozinho independente de JS.
  res.setHeader("X-New-Token", newToken);
  res.cookie(ACCESS_COOKIE_NAME, newToken, {
    httpOnly: true,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    domain: process.env.COOKIE_DOMAIN || undefined,
  });

  req.user = { id: session.user.id, email: session.user.email, plan: session.user.plan };
  next();
}

export function requirePlan(plan: Plan) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (PLAN_RANK[req.user.plan] < PLAN_RANK[plan]) {
      res.status(403).json({ error: "PRO_REQUIRED", upgradeUrl: "/pricing" });
      return;
    }
    next();
  };
}
