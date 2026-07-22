import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@shopspy/shared";

const ACCESS_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

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

  const cookieStore = cookies();
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    domain,
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    domain,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
