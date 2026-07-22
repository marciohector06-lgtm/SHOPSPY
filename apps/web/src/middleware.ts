import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME } from "@shopspy/shared";
import { verifyAccessToken } from "./lib/jwt";

const PROTECTED_PREFIXES = ["/dashboard", "/opportunities", "/products", "/trends"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const user = token ? await verifyAccessToken(token) : null;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/opportunities/:path*", "/products/:path*", "/trends/:path*"],
};
