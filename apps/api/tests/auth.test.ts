import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Nunca chama a API real do Google nos testes — tudo mockado neste módulo.
const { validateAuthorizationCodeMock, fetchGoogleUserInfoMock } = vi.hoisted(() => ({
  validateAuthorizationCodeMock: vi.fn(),
  fetchGoogleUserInfoMock: vi.fn(),
}));

vi.mock("../src/lib/googleAuth", () => ({
  getGoogleClient: () => ({
    createAuthorizationURL: () => new URL("https://accounts.google.com/o/oauth2/v2/auth?mock=1"),
    validateAuthorizationCode: validateAuthorizationCodeMock,
  }),
  fetchGoogleUserInfo: fetchGoogleUserInfoMock,
  GOOGLE_OAUTH_SCOPES: ["openid", "email", "profile"],
}));

const {
  userUpsertMock,
  userCreateMock,
  sessionCreateMock,
  sessionFindUniqueMock,
  sessionDeleteManyMock,
  userFindUniqueMock,
} = vi.hoisted(() => ({
  userUpsertMock: vi.fn(),
  userCreateMock: vi.fn(),
  sessionCreateMock: vi.fn(),
  sessionFindUniqueMock: vi.fn(),
  sessionDeleteManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
}));

vi.mock("@shopspy/database", () => ({
  prisma: {
    user: { upsert: userUpsertMock, create: userCreateMock, findUnique: userFindUniqueMock },
    session: {
      create: sessionCreateMock,
      findUnique: sessionFindUniqueMock,
      deleteMany: sessionDeleteManyMock,
    },
  },
}));

// Contador em memória — determinístico e isolado do Redis real, igual ao
// padrão de tests/health.test.ts e tests/products.test.ts.
const rateLimitStore = new Map<string, number>();
vi.mock("../src/lib/redis", () => ({
  getRedis: () => ({
    incr: async (key: string) => {
      const next = (rateLimitStore.get(key) ?? 0) + 1;
      rateLimitStore.set(key, next);
      return next;
    },
    expire: async () => 1,
  }),
}));

import { createApp } from "../src/app";
import { InMemoryJobLock } from "@shopspy/queue";
import type { Queue } from "bullmq";
import { signAccessToken } from "../src/lib/jwt";

function buildApp() {
  const queue = { add: vi.fn() } as unknown as Queue;
  return createApp({ internalRouterDeps: { queue, lock: new InMemoryJobLock() } });
}

describe("GET /auth/google", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
  });

  it("redireciona pro Google e seta os cookies de state/verifier", async () => {
    const res = await request(buildApp()).get("/auth/google");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("accounts.google.com");
    const cookies: string[] = res.headers["set-cookie"] ?? [];
    expect(cookies.some((c) => c.startsWith("oauth_state="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("oauth_verifier="))).toBe(true);
  });
});

describe("GET /auth/google/callback (Google mockado)", () => {
  beforeEach(() => {
    validateAuthorizationCodeMock.mockReset().mockResolvedValue({ accessToken: () => "google-access-fake" });
    fetchGoogleUserInfoMock.mockReset().mockResolvedValue({
      sub: "google-123",
      email: "novo@gmail.com",
      name: "Usuário Teste",
      picture: "https://lh3.googleusercontent.com/fake",
    });
    userUpsertMock.mockReset().mockResolvedValue({ id: "u1", email: "novo@gmail.com", plan: "FREE", name: "Usuário Teste", avatarUrl: null });
    sessionCreateMock.mockReset().mockResolvedValue({ id: "s1" });
  });

  it("state divergente (CSRF): 400, nunca chama o Google", async () => {
    const res = await request(buildApp())
      .get("/auth/google/callback?code=abc&state=state-da-query")
      .set("Cookie", ["oauth_state=state-do-cookie", "oauth_verifier=verifier-abc"]);

    expect(res.status).toBe(400);
    expect(validateAuthorizationCodeMock).not.toHaveBeenCalled();
  });

  it("state ok: troca o code (mock), upserta o User, cria Session e redireciona pro frontend com os tokens", async () => {
    const res = await request(buildApp())
      .get("/auth/google/callback?code=abc123&state=state-abc")
      .set("Cookie", ["oauth_state=state-abc", "oauth_verifier=verifier-abc"]);

    expect(res.status).toBe(302);
    expect(validateAuthorizationCodeMock).toHaveBeenCalledWith("abc123", "verifier-abc");
    expect(userUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "novo@gmail.com" } })
    );
    expect(sessionCreateMock).toHaveBeenCalledTimes(1);

    const location = new URL(res.headers.location!);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("accessToken")).toBeTruthy();
    expect(location.searchParams.get("refreshToken")).toBeTruthy();
  });

  it("nunca guarda o token do Google — só perfil (email/nome/avatar) no upsert", async () => {
    await request(buildApp())
      .get("/auth/google/callback?code=abc123&state=state-abc")
      .set("Cookie", ["oauth_state=state-abc", "oauth_verifier=verifier-abc"]);

    const callArgs = userUpsertMock.mock.calls[0]![0];
    const serialized = JSON.stringify(callArgs);
    expect(serialized).not.toContain("google-access-fake");
  });
});

describe("POST /auth/logout", () => {
  beforeEach(() => {
    sessionFindUniqueMock.mockReset();
    sessionDeleteManyMock.mockReset().mockResolvedValue({ count: 1 });
  });

  it("invalida a sessão no banco (deleteMany com o token certo)", async () => {
    const res = await request(buildApp()).post("/auth/logout").send({ refreshToken: "refresh-xyz" });

    expect(res.status).toBe(204);
    expect(sessionDeleteManyMock).toHaveBeenCalledWith({ where: { token: "refresh-xyz" } });
  });

  it("depois do logout, esse refresh token não funciona mais em /auth/refresh", async () => {
    await request(buildApp()).post("/auth/logout").send({ refreshToken: "refresh-xyz" });

    // simula o estado real após o delete: a sessão não existe mais
    sessionFindUniqueMock.mockResolvedValue(null);

    const res = await request(buildApp()).post("/auth/refresh").send({ refreshToken: "refresh-xyz" });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  beforeEach(() => {
    userFindUniqueMock.mockReset();
  });

  it("retorna perfil, plano e limites de alerta do usuário autenticado", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "user@shopspy.com",
      name: "User",
      avatarUrl: null,
      plan: "FREE",
      alertsUsed: 1,
      alertsLimit: 3,
    });

    const token = await signAccessToken({ sub: "u1", email: "user@shopspy.com", plan: "FREE", name: "User", avatarUrl: null });
    const res = await request(buildApp()).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "u1",
      email: "user@shopspy.com",
      name: "User",
      avatarUrl: null,
      plan: "FREE",
      alertsUsed: 1,
      alertsLimit: 3,
    });
  });

  it("sem token: 401", async () => {
    const res = await request(buildApp()).get("/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/register (modo de acesso temporário por email+senha)", () => {
  beforeEach(() => {
    rateLimitStore.clear();
    userFindUniqueMock.mockReset();
    userCreateMock.mockReset();
    sessionCreateMock.mockReset().mockResolvedValue({ id: "s-novo" });
  });

  it("cria o usuário com a senha hasheada (nunca em texto puro) e plan PRO, retorna tokens", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    userCreateMock.mockResolvedValue({
      id: "u-novo",
      email: "nova@shopspy.com",
      name: "Nova",
      avatarUrl: null,
      plan: "PRO",
    });

    const res = await request(buildApp())
      .post("/auth/register")
      .send({ name: "Nova", email: "nova@shopspy.com", password: "senha12345" });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();

    const createArgs = userCreateMock.mock.calls[0]![0];
    expect(createArgs.data.plan).toBe("PRO");
    expect(createArgs.data.passwordHash).not.toBe("senha12345");
    expect(createArgs.data.passwordHash.length).toBeGreaterThan(20);
  });

  it("email já cadastrado: 409, nunca chega a criar o usuário", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "existing", email: "ja@shopspy.com" });

    const res = await request(buildApp())
      .post("/auth/register")
      .send({ name: "X", email: "ja@shopspy.com", password: "senha12345" });

    expect(res.status).toBe(409);
    expect(userCreateMock).not.toHaveBeenCalled();
  });

  it("senha curta demais: 400 de validação", async () => {
    const res = await request(buildApp())
      .post("/auth/register")
      .send({ name: "X", email: "curta@shopspy.com", password: "123" });

    expect(res.status).toBe(400);
    expect(userCreateMock).not.toHaveBeenCalled();
  });
});

describe("POST /auth/login (modo de acesso temporário por email+senha)", () => {
  const PASSWORD = "senha-correta-123";
  let passwordHash: string;

  beforeAll(async () => {
    const bcrypt = (await import("bcryptjs")).default;
    passwordHash = await bcrypt.hash(PASSWORD, 12);
  });

  beforeEach(() => {
    rateLimitStore.clear();
    userFindUniqueMock.mockReset();
    sessionCreateMock.mockReset().mockResolvedValue({ id: "s-login" });
  });

  it("credenciais corretas: 200 com tokens", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "user@shopspy.com",
      name: "User",
      avatarUrl: null,
      plan: "FREE",
      passwordHash,
    });

    const res = await request(buildApp())
      .post("/auth/login")
      .send({ email: "user@shopspy.com", password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it("senha errada: 401 com mensagem genérica", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u1", email: "user@shopspy.com", passwordHash, plan: "FREE" });

    const res = await request(buildApp())
      .post("/auth/login")
      .send({ email: "user@shopspy.com", password: "senha-errada" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "credenciais_invalidas", message: "Email ou senha incorretos." });
  });

  it("email inexistente: mesmo status e mesma mensagem de 'senha errada' (não revela qual está errado)", async () => {
    userFindUniqueMock.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/auth/login")
      .send({ email: "naoexiste@shopspy.com", password: "qualquer123" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "credenciais_invalidas", message: "Email ou senha incorretos." });
  });

  it("conta só-Google (passwordHash null): mesma mensagem genérica, nunca 500", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "u2", email: "google@shopspy.com", passwordHash: null, plan: "FREE" });

    const res = await request(buildApp())
      .post("/auth/login")
      .send({ email: "google@shopspy.com", password: "qualquer123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("credenciais_invalidas");
  });

  it(
    "6ª tentativa na mesma janela de 15min: 429",
    async () => {
      userFindUniqueMock.mockResolvedValue(null);

      for (let i = 0; i < 5; i++) {
        const res = await request(buildApp())
          .post("/auth/login")
          .send({ email: "x@shopspy.com", password: "qualquer123" });
        expect(res.status).toBe(401);
      }

      const blocked = await request(buildApp())
        .post("/auth/login")
        .send({ email: "x@shopspy.com", password: "qualquer123" });
      expect(blocked.status).toBe(429);
    },
    15000
  );
});
