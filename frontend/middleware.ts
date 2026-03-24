import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";

// Routes publiques qui ne nécessitent pas d'auth
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/cron/",
  "/api/revalidate",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisser passer les routes publiques et les assets Next.js
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.next(); // Auth non configurée → accès libre

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifyToken(token, secret))) {
    return NextResponse.next();
  }

  // Non authentifié → redirect login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
