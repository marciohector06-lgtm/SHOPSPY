import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@shopspy/shared";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt";

/** Server Components/Route Handlers only — lê o cookie httpOnly e verifica o JWT. */
export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const token = cookies().get(ACCESS_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
