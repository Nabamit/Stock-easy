"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";

export async function getShopProfileAction() {
  const { shopId } = await getShopContext();
  const db = getDb();
  const { data } = await db.from("shops").select("*, subscription_plans(name, price)").eq("id", shopId).single();
  return data;
}

export async function updateShopProfileAction(input: {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) {
  const { shopId } = await getShopContext();
  const db = getDb();
  const { error } = await db.from("shops").update(input).eq("id", shopId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function getStaffAction() {
  const { shopId } = await getShopContext();
  const db = getDb();
  const { data } = await db
    .from("users")
    .select("id, email, name, role, is_active, created_at")
    .eq("shop_id", shopId)
    .neq("role", "central_admin")
    .order("created_at");
  return data ?? [];
}

const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function addStaffAction(input: z.infer<typeof staffSchema>) {
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid staff data" };

  const { shopId } = await getShopContext();
  const db = getDb();

  const { data: existing } = await db.from("users").select("id").eq("email", parsed.data.email).maybeSingle();
  if (existing) return { success: false, error: "Email already registered" };

  const password_hash = await hashPassword(parsed.data.password);
  const { error } = await db.from("users").insert({
    email: parsed.data.email.toLowerCase(),
    name: parsed.data.name,
    password_hash,
    role: "shop_staff",
    shop_id: shopId,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function changePasswordAction(currentPassword: string, newPassword: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not logged in" };

  const db = getDb();
  const { data: user } = await db.from("users").select("password_hash").eq("id", session.userId).single();
  if (!user) return { success: false, error: "User not found" };

  const { verifyPassword } = await import("@/lib/auth/password");
  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) return { success: false, error: "Current password is incorrect" };

  const password_hash = await hashPassword(newPassword);
  await db.from("users").update({ password_hash }).eq("id", session.userId);
  return { success: true };
}

export async function getSubscriptionPlansAction() {
  const db = getDb();
  const { data } = await db.from("subscription_plans").select("*").eq("is_active", true).order("price");
  return data ?? [];
}

export async function selectPlanAction(planId: string) {
  const { shopId } = await getShopContext();
  const db = getDb();

  const { data: plan } = await db.from("subscription_plans").select("*").eq("id", planId).single();
  if (!plan) return { success: false, error: "Plan not found" };

  // Razorpay placeholder — mark as trial/active
  await db.from("shops").update({
    subscription_plan_id: planId,
    subscription_status: "active",
    subscription_expires_at: new Date(Date.now() + plan.duration_months * 30 * 86400000).toISOString(),
  }).eq("id", shopId);

  await db.from("subscription_payments").insert({
    shop_id: shopId,
    plan_id: planId,
    amount: plan.price,
    status: "completed",
    razorpay_payment_id: `placeholder_${Date.now()}`,
    paid_at: new Date().toISOString(),
  });

  revalidatePath("/settings");
  return { success: true, message: "Plan activated (Razorpay integration placeholder)" };
}
