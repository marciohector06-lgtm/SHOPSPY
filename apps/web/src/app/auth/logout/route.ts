import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@shopspy/shared";

/** Invalida a sessão na API (apaga a Session do banco) e limpa os cookies locais. */
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  if (refreshToken) {
    await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      // mesmo se a API estiver fora do ar, ainda limpamos o cookie local
    });
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(ACCESS_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}
