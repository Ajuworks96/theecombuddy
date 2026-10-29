import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "teb_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets, and internal next requests pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // API Routes: Enforce CSRF Origin verification on mutations (POST, PUT, DELETE, PATCH)
  if (
    pathname.startsWith("/api/") &&
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    pathname !== "/api/auth/login"
  ) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: "CSRF check failed: Cross-origin mutation forbidden" },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "CSRF check failed: Malformed Origin header" },
          { status: 403 }
        );
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
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
