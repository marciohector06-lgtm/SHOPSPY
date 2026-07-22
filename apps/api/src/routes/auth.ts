import { Router } from "express";
import { z } from "zod";
import { generateCodeVerifier, generateState, OAuth2Tokens } from "arctic";
import { prisma } from "@shopspy/database";
import { REFRESH_COOKIE_NAME } from "@shopspy/shared";
import { fetchGoogleUserInfo, getGoogleClient, GOOGLE_OAUTH_SCOPES } from "../lib/googleAuth";
import { signAccessToken } from "../lib/jwt";
import { createSession, findValidSession, invalidateSession } from "../lib/sessions";
import { authMiddleware } from "../lib/authMiddleware";
import { validate } from "../lib/validate";

const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

function frontendUrl(path: string): string {
  const base = process.env.FRONTEND_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

export function createAuthRouter(): Router {
  const router = Router();

  /** Inicia o fluxo OAuth: gera state+PKCE, guarda em cookies curtos e manda pro Google. */
  router.get("/google", (_req, res) => {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = getGoogleClient().createAuthorizationURL(state, codeVerifier, GOOGLE_OAUTH_SCOPES);

    const cookieOpts = { httpOnly: true, maxAge: OAUTH_COOKIE_MAX_AGE_MS, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
    res.cookie("oauth_state", state, cookieOpts);
    res.cookie("oauth_verifier", codeVerifier, cookieOpts);
    res.redirect(url.toString());
  });

  /** Callback do Google: valida state (CSRF), troca o code, cria/atualiza o User e a Session, e manda o token pro frontend. */
  router.get("/google/callback", async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies?.oauth_state;
    const codeVerifier = req.cookies?.oauth_verifier;

    res.clearCookie("oauth_state");
    res.clearCookie("oauth_verifier");

    if (typeof code !== "string" || typeof state !== "string" || !storedState || state !== storedState || !codeVerifier) {
      res.status(400).json({ error: "oauth_state_invalido" });
      return;
    }

    let tokens: OAuth2Tokens;
    try {
      tokens = await getGoogleClient().validateAuthorizationCode(code, codeVerifier);
    } catch {
      res.status(400).json({ error: "falha_ao_validar_code_google" });
      return;
    }

    const profile = await fetchGoogleUserInfo(tokens.accessToken());

    // Nunca guardamos o token do Google — só os dados de perfil.
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      create: { email: profile.email, name: profile.name, avatarUrl: profile.picture },
      update: { name: profile.name, avatarUrl: profile.picture },
    });

    const session = await createSession({ userId: user.id, userAgent: req.header("user-agent"), ip: req.ip });
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      plan: user.plan,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });

    const redirectUrl = new URL(frontendUrl("/auth/callback"));
    redirectUrl.searchParams.set("accessToken", accessToken);
    redirectUrl.searchParams.set("refreshToken", session.token);
    res.redirect(redirectUrl.toString());
  });

  const refreshSchema = z.object({ refreshToken: z.string().min(1).optional() });

  router.post("/refresh", validate(refreshSchema, "body"), async (req, res) => {
    const body = req.body as z.infer<typeof refreshSchema>;
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? body.refreshToken;

    if (!refreshToken) {
      res.status(400).json({ error: "refreshToken obrigatório" });
      return;
    }

    const session = await findValidSession(refreshToken);
    if (!session) {
      res.status(401).json({ error: "refresh_invalido_ou_expirado" });
      return;
    }

    const accessToken = await signAccessToken({
      sub: session.user.id,
      email: session.user.email,
      plan: session.user.plan,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    });
    res.json({ accessToken });
  });

  router.post("/logout", validate(refreshSchema, "body"), async (req, res) => {
    const body = req.body as z.infer<typeof refreshSchema>;
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ?? body.refreshToken;

    if (refreshToken) await invalidateSession(refreshToken);
    res.status(204).send();
  });

  router.get("/me", authMiddleware, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: "usuário não encontrado" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      alertsUsed: user.alertsUsed,
      alertsLimit: user.alertsLimit,
    });
  });

  return router;
}
