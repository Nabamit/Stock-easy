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
  shop_photo_url?: string;
  alternate_phone?: string;
  alternate_email?: string;
  owner_name?: string;
}) {
  const { shopId } = await getShopContext();
  const db = getDb();

  // Fetch shop status to see if approved
  const { data: shop } = await db.from("shops").select("verification_status").eq("id", shopId).single();

  if (shop && shop.verification_status === "approved") {
    // If approved, name, address, phone, city, state, pincode, GST, PAN, etc. are read-only
    const allowedInput: any = {};
    if (input.shop_photo_url !== undefined) allowedInput.shop_photo_url = input.shop_photo_url;
    if (input.alternate_phone !== undefined) allowedInput.alternate_phone = input.alternate_phone;
    if (input.alternate_email !== undefined) allowedInput.alternate_email = input.alternate_email;

    const lockedFields = ["name", "phone", "address", "city", "state", "pincode", "owner_name"];
    const attemptedLocks = Object.keys(input).filter(
      (k) => lockedFields.includes(k) && (input as any)[k] !== undefined
    );

    if (attemptedLocks.length > 0) {
      return { success: false, error: "Cannot change verified shop details. These fields are read-only." };
    }

    const { error } = await db.from("shops").update(allowedInput).eq("id", shopId);
    if (error) return { success: false, error: error.message };
  } else {
    // If pending/rejected, user can modify all fields
    const { error } = await db.from("shops").update(input).eq("id", shopId);
    if (error) return { success: false, error: error.message };
  }

  // Rebuild session and update session cookie to sync details like shop photo URL instantly
  const sessionUser = await getSession();
  if (sessionUser) {
    const { buildSession } = await import("@/lib/auth/actions");
    const { createSessionToken, setSessionCookie } = await import("@/lib/auth/session");
    const updatedSession = await buildSession(sessionUser.userId);
    if (updatedSession) {
      const token = await createSessionToken(updatedSession);
      await setSessionCookie(token);
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deactivateShopAccountAction() {
  const { shopId } = await getShopContext();
  const db = getDb();

  const { error } = await db
    .from("shops")
    .update({ is_active: false })
    .eq("id", shopId);

  if (error) return { success: false, error: error.message };

  // Log user out by clearing session cookie
  const { clearSessionCookie } = await import("@/lib/auth/session");
  await clearSessionCookie();

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

  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  // Enforce Subscription Limits
  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  const { count } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("role", "shop_staff");

  if (count !== null && count >= limits.staffLimit) {
    return {
      success: false,
      error: `Staff account limit of ${limits.staffLimit} reached. Please upgrade your subscription plan.`,
    };
  }

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

export async function deleteStaffAction(staffUserId: string) {
  const { shopId, session } = await getShopContext();
  if (session.role !== "shop_owner") {
    return { success: false, error: "Only shop owners can delete staff accounts." };
  }
  const db = getDb();

  // Make sure the staff member belongs to the owner's shop and is actually a staff user
  const { data: staff } = await db
    .from("users")
    .select("id, role, shop_id")
    .eq("id", staffUserId)
    .single();

  if (!staff) return { success: false, error: "Staff user not found." };
  if (staff.shop_id !== shopId) {
    return { success: false, error: "Access denied. User does not belong to your shop." };
  }
  if (staff.role !== "shop_staff") {
    return { success: false, error: "Only staff accounts can be deleted." };
  }

  const { error } = await db.from("users").delete().eq("id", staffUserId);
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
  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  const { data: plan } = await db.from("subscription_plans").select("*").eq("id", planId).single();
  if (!plan) return { success: false, error: "Plan not found" };

  // Razorpay placeholder — mark as active
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

export async function toggleAutoRenewAction(autoRenew: boolean) {
  const { shopId } = await getShopContext();
  const db = getDb();
  await db.from("shops").update({ auto_renew: autoRenew }).eq("id", shopId);
  revalidatePath("/settings");
  return { success: true, auto_renew: autoRenew };
}
