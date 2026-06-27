import { NextResponse } from "next/server";
import { getSession, createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !session.shopId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const db = getDb();
  const { data: shop } = await db
    .from("shops")
    .select("verification_status")
    .eq("id", session.shopId)
    .single();

  if (shop?.verification_status === "approved") {
    // Update the session payload
    session.shopVerified = true;
    const token = await createSessionToken(session);
    
    // Set the updated cookie (this is allowed inside a Route Handler GET request)
    await setSessionCookie(token);
    
    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If still pending, redirect back to the pending page
  return NextResponse.redirect(new URL("/pending", request.url));
}
