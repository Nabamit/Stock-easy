import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { SessionPayload } from "@/types";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn("SESSION_SECRET is not defined in session.ts, falling back to dev secret.");
    return new TextEncoder().encode("dev-secret-change-in-production-32chars");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  let isLocal = false;
  let isHttp = false;

  try {
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const xForwardedProto = headersList.get("x-forwarded-proto") || "";
    
    isLocal = host.includes("localhost") || 
              host.includes("127.0.0.1") || 
              host.startsWith("192.168.") || 
              host.startsWith("10.");
    isHttp = xForwardedProto === "http" || host.startsWith("http://");
  } catch (err) {
    console.warn("Failed to read headers in setSessionCookie:", err);
  }

  const isProd = process.env.NODE_ENV === "production";
  const secureCookie = isProd && !isLocal && !isHttp;

  console.log(`Setting session cookie. secure: ${secureCookie}, isProd: ${isProd}, isLocal: ${isLocal}`);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function isShopUser(session: SessionPayload): boolean {
  return session.role === "shop_owner" || session.role === "shop_staff";
}

export function isCentralAdmin(session: SessionPayload): boolean {
  return session.role === "central_admin";
}

export function canAccessShopFeatures(session: SessionPayload): boolean {
  if (isCentralAdmin(session)) return false;
  return session.shopVerified === true;
}