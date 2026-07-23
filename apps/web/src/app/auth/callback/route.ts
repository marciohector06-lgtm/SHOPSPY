import { NextResponse, type NextRequest } from "next/server";
import { setAuthCookies } from "../../../lib/authCookies";

/**
 * A API redireciona pra aqui com os tokens na query, depois do Google
 * confirmar o login. Só o Route Handler (server-side) pode gravar cookie
 * httpOnly — por isso o front nunca guarda token em localStorage nem em
 * estado de client component.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get("accessToken");
  const refreshToken = request.nextUrl.searchParams.get("refreshToken");

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }

  setAuthCookies(accessToken, refreshToken);

  return NextResponse.redirect(new URL("/explorar", request.url));
}
