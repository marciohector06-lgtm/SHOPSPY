import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { SignJWT } from "jose";

const { sessionFindUniqueMock } = vi.hoisted(() => ({ sessionFindUniqueMock: vi.fn() }));

vi.mock("@shopspy/database", () => ({
  prisma: { session: { findUnique: sessionFindUniqueMock } },
}));

import { authMiddleware, requirePlan } from "../src/lib/authMiddleware";
import { signAccessToken } from "../src/lib/jwt";

function buildTestApp() {
  const app = express();
  app.use(cookieParser());
  app.get("/protected", authMiddleware, (req, res) => res.json({ user: req.user }));
  app.get("/pro-only", authMiddleware, requirePlan("PRO"), (req, res) => res.json({ ok: true }));
  return app;
}

async function signExpiredToken(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: "user@shopspy.com", plan: "FREE", name: "User", avatarUrl: null })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user1")
    .setIssuedAt(now - 7200)
    .setExpirationTime(now - 3600) // expirou há 1h
    .sign(secret);
}

describe("authMiddleware", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
  });

  beforeEach(() => {
    sessionFindUniqueMock.mockReset();
  });

  it("sem token, responde 401", async () => {
    const res = await request(buildTestApp()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("token válido: passa e popula req.user", async () => {
    const token = await signAccessToken({ sub: "user1", email: "user@shopspy.com", plan: "PRO", name: null, avatarUrl: null });
    const res = await request(buildTestApp()).get("/protected").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: "user1", email: "user@shopspy.com", plan: "PRO" });
    expect(res.headers["x-new-token"]).toBeUndefined();
  });

  it("token expirado + refresh válido: renova sozinho e manda X-New-Token", async () => {
    sessionFindUniqueMock.mockResolvedValue({
      token: "refresh-abc",
      expiresAt: new Date(Date.now() + 86_400_000),
      user: { id: "user1", email: "user@shopspy.com", plan: "FREE", name: "User", avatarUrl: null },
    });

    const expired = await signExpiredToken();
    const res = await request(buildTestApp())
      .get("/protected")
      .set("Authorization", `Bearer ${expired}`)
      .set("Cookie", "shopspy_refresh=refresh-abc");

    expect(res.status).toBe(200);
    expect(res.headers["x-new-token"]).toBeTruthy();
    expect(res.headers["set-cookie"]?.some((c: string) => c.startsWith("shopspy_access="))).toBe(true);
    expect(res.body.user).toEqual({ id: "user1", email: "user@shopspy.com", plan: "FREE" });
  });

  it("token expirado + refresh inválido/inexistente: responde 401", async () => {
    sessionFindUniqueMock.mockResolvedValue(null);

    const expired = await signExpiredToken();
    const res = await request(buildTestApp())
      .get("/protected")
      .set("Authorization", `Bearer ${expired}`)
      .set("Cookie", "shopspy_refresh=refresh-invalido");

    expect(res.status).toBe(401);
  });

  it("token expirado + refresh também expirado no banco: responde 401", async () => {
    sessionFindUniqueMock.mockResolvedValue({
      token: "refresh-abc",
      expiresAt: new Date(Date.now() - 1000), // já expirou
      user: { id: "user1", email: "user@shopspy.com", plan: "FREE", name: null, avatarUrl: null },
    });

    const expired = await signExpiredToken();
    const res = await request(buildTestApp())
      .get("/protected")
      .set("Authorization", `Bearer ${expired}`)
      .set("Cookie", "shopspy_refresh=refresh-abc");

    expect(res.status).toBe(401);
  });
});

describe("requirePlan", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = "test-secret";
  });

  it("plano FREE numa rota PRO: 403 com PRO_REQUIRED e upgradeUrl", async () => {
    const token = await signAccessToken({ sub: "user1", email: "free@shopspy.com", plan: "FREE", name: null, avatarUrl: null });
    const res = await request(buildTestApp()).get("/pro-only").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "PRO_REQUIRED", upgradeUrl: "/pricing" });
  });

  it("plano PRO numa rota PRO: passa", async () => {
    const token = await signAccessToken({ sub: "user1", email: "pro@shopspy.com", plan: "PRO", name: null, avatarUrl: null });
    const res = await request(buildTestApp()).get("/pro-only").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
