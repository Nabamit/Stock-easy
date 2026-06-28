import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, ROUTES } from "@/lib/constants";
import type { SessionPayload } from "@/types";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn("SESSION_SECRET is not defined in proxy.ts, falling back to dev secret.");
    return new TextEncoder().encode("dev-secret-change-in-production-32chars");
  }
  return new TextEncoder().encode(secret);
}

async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const allCookies = request.cookies.getAll();
  console.log("Proxy Cookies:", allCookies.map(c => c.name));
  
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    console.log(`Proxy: Cookie "${SESSION_COOKIE}" was NOT found.`);
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    console.log("Proxy JWT Success. Role:", payload.role, "ShopVerified:", (payload as any).shopVerified);
    return payload as unknown as SessionPayload;
  } catch (error) {
    console.error("Proxy JWT verification failed:", error);
    return null;
  }
}

const shopPaths = ["/dashboard", "/billing", "/medicines", "/stock", "/inventory", "/dealers", "/analytics", "/ai", "/bills", "/sales", "/settings"];
const adminPaths = ["/admin/dashboard", "/admin/verification", "/admin/shops", "/admin/billing", "/admin/analytics", "/admin/panel", "/admin/support", "/admin/settings"];

import { createClient } from "@supabase/supabase-js";

async function isMaintenanceModeActive(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { data } = await supabase
      .from("platform_settings")
      .select("maintenance_mode")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();
    return !!data?.maintenance_mode;
  } catch (e) {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (
    pathname === "/maintenance" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  // Enforce Maintenance Redirect
  const maintenanceActive = await isMaintenanceModeActive();
  if (maintenanceActive) {
    const isCentralAdmin = session?.role === "central_admin";
    const isAdminLoginRoute = pathname === "/admin/login";
    if (!isCentralAdmin && !isAdminLoginRoute) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  }

  const isShopRoute = shopPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAdminRoute = adminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isPendingRoute = pathname === "/pending";

  // Redirect logged-in users away from auth pages
  if (session && (pathname === "/login" || pathname === "/register")) {
    if (session.role === "central_admin") {
      return NextResponse.redirect(new URL(ROUTES.adminDashboard, request.url));
    }
    if (session.role === "shop_staff") {
      return NextResponse.redirect(new URL("/billing", request.url));
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
    
    // Redirect suspended shops to Settings/Support page only
    if ((session as any).isSuspended) {
      if (pathname !== "/settings") {
        return NextResponse.redirect(new URL("/settings", request.url));
      }
    }

    // Staff route limitation
    if (session.role === "shop_staff") {
      const allowedPaths = ["/billing", "/inventory", "/ai", "/bills", "/sales"];
      const isAllowed = allowedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/billing", request.url));
      }
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
