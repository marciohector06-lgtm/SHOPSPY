import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateCodeVerifier, generateState, OAuth2Tokens } from "arctic";
import { prisma } from "@shopspy/database";
import { REFRESH_COOKIE_NAME } from "@shopspy/shared";
import { fetchGoogleUserInfo, getGoogleClient, GOOGLE_OAUTH_SCOPES } from "../lib/googleAuth";
import { signAccessToken } from "../lib/jwt";
import { createSession, findValidSession, invalidateSession } from "../lib/sessions";
import { authMiddleware } from "../lib/authMiddleware";
import { validate } from "../lib/validate";
import { authRateLimit } from "../lib/authRateLimit";

const OAUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
const BCRYPT_SALT_ROUNDS = 12;

// Hash fixo (custo 12) só pra dar tempo ao bcrypt.compare quando o email não
// existe — sem isso, "usuário não encontrado" responde bem mais rápido que
// "senha errada" e um atacante consegue enumerar emails cadastrados pelo
// tempo de resposta, mesmo a mensagem de erro sendo idêntica nos dois casos.
const DUMMY_HASH = bcrypt.hashSync("nao-existe-nenhum-usuario-com-essa-senha", BCRYPT_SALT_ROUNDS);

// Login/registro por email+senha é um modo de acesso temporário para
// destravar testes manuais sem depender do OAuth do Google — não é o fluxo
// de produto (a landing e o DEPLOY.md continuam vendendo só "Entrar com
// Google"). Fica ligado fora de produção por padrão; em produção só liga de
// propósito via env var, porque /register aqui cria conta já em plan: PRO.
const PASSWORD_AUTH_ENABLED = process.env.NODE_ENV !== "production" || process.env.ENABLE_PASSWORD_AUTH === "true";

function requirePasswordAuthEnabled(_req: Request, res: Response, next: NextFunction): void {
  if (!PASSWORD_AUTH_ENABLED) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  next();
}

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

  const registerSchema = z.object({
    name: z.string().trim().min(1, "nome obrigatório").max(120, "nome muito longo"),
    email: z.string().trim().toLowerCase().email("email inválido").max(200),
    password: z.string().min(8, "senha deve ter no mínimo 8 caracteres").max(200),
  });

  /**
   * Modo de acesso temporário (ver PASSWORD_AUTH_ENABLED acima): cria a
   * conta já em plan: PRO pra destravar teste manual completo sem precisar
   * passar pelo checkout. Não usar como fluxo real de upgrade.
   */
  router.post(
    "/register",
    requirePasswordAuthEnabled,
    authRateLimit("register"),
    validate(registerSchema, "body"),
    async (req, res) => {
      const body = req.body as z.infer<typeof registerSchema>;

      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (existing) {
        res.status(409).json({ error: "email_ja_cadastrado", message: "Esse email já tem uma conta." });
        return;
      }

      const passwordHash = await bcrypt.hash(body.password, BCRYPT_SALT_ROUNDS);
      const user = await prisma.user.create({
        data: { name: body.name, email: body.email, passwordHash, plan: "PRO" },
      });

      const session = await createSession({ userId: user.id, userAgent: req.header("user-agent"), ip: req.ip });
      const accessToken = await signAccessToken({
        sub: user.id,
        email: user.email,
        plan: user.plan,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });

      res.status(201).json({ accessToken, refreshToken: session.token });
    }
  );

  const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email("email inválido"),
    password: z.string().min(1, "senha obrigatória"),
  });

  router.post(
    "/login",
    requirePasswordAuthEnabled,
    authRateLimit("login"),
    validate(loginSchema, "body"),
    async (req, res) => {
      const body = req.body as z.infer<typeof loginSchema>;

      const user = await prisma.user.findUnique({ where: { email: body.email } });
      // Roda o compare mesmo sem usuário (contra DUMMY_HASH) — mesma mensagem
      // de erro E mesmo tempo de resposta pra "email não existe" e "senha
      // errada", pra não dar pra descobrir emails cadastrados por timing.
      const validPassword = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);

      if (!user || !user.passwordHash || !validPassword) {
        res.status(401).json({ error: "credenciais_invalidas", message: "Email ou senha incorretos." });
        return;
      }

      const session = await createSession({ userId: user.id, userAgent: req.header("user-agent"), ip: req.ip });
      const accessToken = await signAccessToken({
        sub: user.id,
        email: user.email,
        plan: user.plan,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });

      res.json({ accessToken, refreshToken: session.token });
    }
  );

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
