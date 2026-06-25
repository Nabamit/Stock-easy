"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/supabase/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} from "@/lib/auth/session";
import type { SessionPayload, ShopRegistrationInput } from "@/types";
import { ROUTES } from "@/lib/constants";

// ==========================================
// SCHEMAS & TYPES
// ==========================================

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  shopName: z.string().min(2, "Shop name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Valid phone number required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6, "Valid pincode required"),
  drugLicenseNo: z.string().min(1, "Drug license number required"),
  panNo: z.string().min(10, "Valid PAN required"),
  gstNo: z.string().min(15, "Valid GST number required"),
  drugLicenseUrl: z.string().url("Drug license document required"),
  panUrl: z.string().url("PAN document required"),
  gstUrl: z.string().url("GST document required"),
  shopPhotoUrl: z.string().url("Shop photo required"),
  subscriptionPlanId: z.string().uuid("Select a subscription plan"),
});

export type AuthActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// ==========================================
// HELPER UTILS
// ==========================================

async function buildSession(userId: string): Promise<SessionPayload | null> {
  const db = getDb();

  const { data: user, error } = await db
    .from("users")
    .select("id, email, name, role, shop_id, is_active")
    .eq("id", userId)
    .single();

  if (error || !user || !user.is_active) return null;

  let shopVerified = false;
  let shopName: string | null = null;

  if (user.shop_id) {
    const { data: shop } = await db
      .from("shops")
      .select("name, verification_status")
      .eq("id", user.shop_id)
      .single();

    if (shop) {
      shopName = shop.name;
      shopVerified = shop.verification_status === "approved";
    }
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    shopId: user.shop_id,
    shopVerified,
    shopName,
  };
}

// ==========================================
// CORE ACTIONS
// ==========================================

export async function loginAction(
  formData: FormData
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const { data: user, error } = await db
    .from("users")
    .select("id, password_hash, is_active")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !user || !user.is_active) {
    return { success: false, error: "Invalid email or password" };
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return { success: false, error: "Invalid email or password" };
  }

  const session = await buildSession(user.id);
  if (!session) {
    return { success: false, error: "Account is inactive or not found" };
  }

  const token = await createSessionToken(session);
  await setSessionCookie(token);

  if (session.role === "central_admin") {
    redirect(ROUTES.adminDashboard);
  }

  if (!session.shopVerified) {
    redirect(ROUTES.shopPending);
  }

  redirect(ROUTES.shopDashboard);
}

export async function registerAction(
  input: ShopRegistrationInput
): Promise<AuthActionResult> {
  try {
    const parsed = registerSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const data = parsed.data;
    const db = getDb();

    // Check email uniqueness explicitly
    const { data: existing } = await db
      .from("users")
      .select("id")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return { success: false, error: "An account with this email already exists" };
    }

    const passwordHash = await hashPassword(data.password);

    // 1. Create shop first (pending verification state)
    const { data: shop, error: shopError } = await db
      .from("shops")
      .insert({
        name: data.shopName,
        owner_name: data.ownerName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        drug_license_no: data.drugLicenseNo,
        pan_no: data.panNo,
        gst_no: data.gstNo,
        drug_license_url: data.drugLicenseUrl,
        pan_url: data.panUrl,
        gst_url: data.gstUrl,
        shop_photo_url: data.shopPhotoUrl,
        verification_status: "pending",
        subscription_plan_id: data.subscriptionPlanId,
        subscription_status: "trial",
      })
      .select("id")
      .single();

    if (shopError || !shop) {
      console.error("Shop registration failed at [Shop Table Insertion]:", shopError);
      return { 
        success: false, 
        error: `Failed to initialize shop record: ${shopError?.message || "Unknown schema error"}` 
      };
    }

    // 2. Create owner user profile linked to the shop
    const { data: newUser, error: userError } = await db
      .from("users")
      .insert({
        email: data.email.toLowerCase(),
        password_hash: passwordHash,
        name: data.ownerName,
        role: "shop_owner", 
        shop_id: shop.id,
      })
      .select("id")
      .single();

    if (userError || !newUser) {
      console.error("Shop registration failed at [User Table Insertion]:", userError);
      
      // Attempt clean up of the orphaned shop record securely without crashing thread
      try {
        await db.from("shops").delete().eq("id", shop.id);
      } catch (cleanupError) {
        console.error("Cascading cleanup warning during registration fallback:", cleanupError);
      }

      return { 
        success: false, 
        error: `Failed to create owner user profile: ${userError?.message || "Verify your roles setup"}` 
      };
    }

    // 3. Link owner back to the shop record
    const { error: shopUpdateError } = await db
      .from("shops")
      .update({ owner_user_id: newUser.id })
      .eq("id", shop.id);

    if (shopUpdateError) {
      console.error("Shop registration failed at [Shop Cross Link Update]:", shopUpdateError);
      return { 
        success: false, 
        error: `Failed linking management records: ${shopUpdateError.message}` 
      };
    }

    // 4. Record base subscription billing record
    const { data: plan } = await db
      .from("subscription_plans")
      .select("price")
      .eq("id", data.subscriptionPlanId)
      .single();

    if (plan) {
      const { error: paymentError } = await db.from("subscription_payments").insert({
        shop_id: shop.id,
        plan_id: data.subscriptionPlanId,
        amount: plan.price,
        status: "completed",
        razorpay_payment_id: `reg_placeholder_${Date.now()}`,
        paid_at: new Date().toISOString(),
      });
      if (paymentError) {
        console.error("Non-critical registration setup anomaly [Subscription Log]:", paymentError);
      }
    }

    // 5. Build baseline cluster configurations
    const { error: clusterError } = await db.from("discount_clusters").insert([
      { shop_id: shop.id, name: "Cluster A (15%)", discount_percent: 15 },
      { shop_id: shop.id, name: "Cluster B (20%)", discount_percent: 20 },
      { shop_id: shop.id, name: "Cluster C (25%)", discount_percent: 25 },
    ]);
    
    if (clusterError) {
      console.error("Non-critical registration setup anomaly [Cluster Defaults]:", clusterError);
    }

    // 6. Generate Session and Authenticate User
    const session = await buildSession(newUser.id);
    if (!session) {
      return { success: false, error: "Registration database steps completed, but session activation failed." };
    }

    const token = await createSessionToken(session);
    await setSessionCookie(token);

    // Secure navigation invocation outside standard catch sequence processing
    redirect(ROUTES.shopPending);

  } catch (error) {
    // Structural Guard: Intercept Next.js client routing redirects and route cleanly
    if (
      (error instanceof Error && error.message === "NEXT_REDIRECT") ||
      (typeof error === "object" && error !== null && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT"))
    ) {
      throw error;
    }

    console.error("Critical Exception caught during registration action execution:", error);
    return { 
      success: false, 
      error: "An unexpected runtime error occurred on the application server during submission." 
    };
  }
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect(ROUTES.home);
}

// ==========================================
// SESSION ROUTING GUARDS
// ==========================================

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }
  return session;
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "central_admin") {
    redirect(ROUTES.shopDashboard);
  }
  return session;
}

export async function requireVerifiedShopSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role === "central_admin") {
    redirect(ROUTES.adminDashboard);
  }
  if (!session.shopVerified) {
    redirect(ROUTES.shopPending);
  }
  return session;
}