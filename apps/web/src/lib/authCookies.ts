import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@shopspy/shared";

const ACCESS_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Só um Route Handler (server-side) pode chamar isso — grava os dois cookies httpOnly de sessão. */
export function setAuthCookies(accessToken: string, refreshToken: string): void {
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
}
