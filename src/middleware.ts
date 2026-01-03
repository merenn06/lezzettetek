import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("[middleware] Request to:", pathname);

  // Allow access to /admin/login
  if (pathname === "/admin/login") {
    console.log("[middleware] Allowing /admin/login");
    return NextResponse.next();
  }

  // Protect /admin and /admin/* routes
  if (pathname.startsWith("/admin")) {
    const adminSession = request.cookies.get("admin_session");
    console.log("[middleware] Checking admin session cookie:", adminSession ? "exists" : "missing");

    // If no admin_session cookie, redirect to login
    if (!adminSession) {
      console.log("[middleware] No session, redirecting to login");
      const loginUrl = new URL("/admin/login", request.url);
      // Preserve the original URL as a query parameter for redirect after login
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Session exists, allow access
    console.log("[middleware] Session exists, allowing access");
    return NextResponse.next();
  }

  // Allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};

