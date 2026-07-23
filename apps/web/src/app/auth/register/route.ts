import { NextResponse, type NextRequest } from "next/server";
import { setAuthCookies } from "../../../lib/authCookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Proxy do cadastro por email+senha (modo de acesso temporário) — ver apps/web/src/app/auth/login/route.ts. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: "api_unreachable", message: "Não foi possível conectar à API." },
      { status: 502 }
    );
  }

  const data = await apiResponse.json().catch(() => null);

  if (!apiResponse.ok || !data?.accessToken || !data?.refreshToken) {
    return NextResponse.json(data ?? { error: "register_failed" }, { status: apiResponse.status || 500 });
  }

  setAuthCookies(data.accessToken, data.refreshToken);
  return NextResponse.json({ ok: true });
}
