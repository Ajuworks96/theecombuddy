import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "teb_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets, api routes, and internal next requests pass through
  // API routes handle their own 401 JSON responses
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);
  let hasValidSession = false;

  if (sessionCookie?.value) {
    try {
      const data = JSON.parse(
        Buffer.from(sessionCookie.value, "base64").toString("utf-8")
      );
      if (data?.token && (!data.expiresAt || Date.now() < data.expiresAt)) {
        hasValidSession = true;
      }
    } catch {
      hasValidSession = false;
    }
  }

  // If user is at login page and already authenticated, redirect to dashboard
  if (pathname === "/login") {
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // All other pages require an authenticated session
  if (!hasValidSession) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
