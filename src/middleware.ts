import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, ROUTES } from "@/lib/constants";
import type { SessionPayload } from "@/types";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return new TextEncoder().encode("dev-secret-change-in-production-32chars");
  return new TextEncoder().encode(secret);
}

async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

const shopPaths = ["/dashboard", "/billing", "/medicines", "/stock", "/inventory", "/dealers", "/analytics", "/ai", "/bills", "/settings"];
const adminPaths = ["/admin/dashboard", "/admin/verification", "/admin/shops", "/admin/billing", "/admin/analytics"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);

  const isShopRoute = shopPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdminRoute = adminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPendingRoute = pathname === "/pending";

  // Redirect logged-in users away from auth pages
  if (session && (pathname === "/login" || pathname === "/register")) {
    if (session.role === "central_admin") {
      return NextResponse.redirect(new URL(ROUTES.adminDashboard, request.url));
    }
    if (!session.shopVerified) {
      return NextResponse.redirect(new URL(ROUTES.shopPending, request.url));
    }
    return NextResponse.redirect(new URL(ROUTES.shopDashboard, request.url));
  }

  if (session && pathname === "/admin/login") {
    return NextResponse.redirect(new URL(ROUTES.adminDashboard, request.url));
  }

  // Protect shop routes
  if (isShopRoute) {
    if (!session) {
      return NextResponse.redirect(new URL(ROUTES.login, request.url));
    }
    if (session.role === "central_admin") {
      return NextResponse.redirect(new URL(ROUTES.adminDashboard, request.url));
    }
    if (!session.shopVerified) {
      return NextResponse.redirect(new URL(ROUTES.shopPending, request.url));
    }
  }

  // Protect admin routes
  if (isAdminRoute) {
    if (!session) {
      return NextResponse.redirect(new URL(ROUTES.adminLogin, request.url));
    }
    if (session.role !== "central_admin") {
      return NextResponse.redirect(new URL(ROUTES.shopDashboard, request.url));
    }
  }

  // Pending page: only unverified shop users
  if (isPendingRoute) {
    if (!session) {
      return NextResponse.redirect(new URL(ROUTES.login, request.url));
    }
    if (session.role === "central_admin") {
      return NextResponse.redirect(new URL(ROUTES.adminDashboard, request.url));
    }
    if (session.shopVerified) {
      return NextResponse.redirect(new URL(ROUTES.shopDashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/uploadthing|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
