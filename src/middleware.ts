import { NextRequest, NextResponse } from "next/server";
import { validateApiToken } from "@/lib/utils/api-auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/health",
];

// Routes that use special authentication (e.g., vercel-cron)
const SPECIAL_AUTH_ROUTES = [
  "/api/system/cleanup", // Uses vercel-cron user-agent check
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Allow special auth routes (they handle their own auth)
  if (SPECIAL_AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For all other API routes, require bearer token
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!validateApiToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
