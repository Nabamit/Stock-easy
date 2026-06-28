"use server";

import { redirect, unstable_rethrow } from "next/navigation";
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
  redirectUrl?: string;
};

// ==========================================
// HELPER UTILS
// ==========================================

export async function buildSession(userId: string): Promise<SessionPayload | null> {
  const db = getDb();

  const { data: user, error } = await db
    .from("users")
    .select("id, email, name, role, shop_id, is_active")
    .eq("id", userId)
    .single();

  if (error || !user || !user.is_active) return null;

  let shopVerified = false;
  let shopName: string | null = null;
  let shopPhotoUrl: string | null = null;
  let ownerName: string | null = null;
  let subscriptionStatus: "trial" | "active" | "expired" | "cancelled" | null = null;
  let isSuspended = false;

  if (user.shop_id) {
    const { data: shop } = await db
      .from("shops")
      .select("name, verification_status, shop_photo_url, owner_name, subscription_status, is_suspended")
      .eq("id", user.shop_id)
      .single();

    if (shop) {
      shopName = shop.name;
      shopVerified = shop.verification_status === "approved";
      subscriptionStatus = shop.subscription_status as any;
      isSuspended = !!shop.is_suspended;
      // Avoid inserting massive base64 image strings into the session cookie (browser limit 4KB)
      shopPhotoUrl = (shop.shop_photo_url && !shop.shop_photo_url.startsWith("data:"))
        ? shop.shop_photo_url
        : null;
      ownerName = shop.owner_name;
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
    shopPhotoUrl,
    ownerName,
    subscriptionStatus,
    isSuspended,
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

  // Check maintenance mode
  const { data: settings } = await db
    .from("platform_settings")
    .select("maintenance_mode")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .single();

  if (settings?.maintenance_mode && session.role !== "central_admin") {
    return {
      success: false,
      error: "The platform is currently undergoing maintenance. Only central administrators are allowed to log in at this time.",
    };
  }

  const token = await createSessionToken(session);
  await setSessionCookie(token);

  if (session.role === "central_admin") {
    redirect(ROUTES.adminDashboard);
  }

  if (!session.shopVerified) {
    redirect(ROUTES.shopPending);
  }

  if (session.role === "shop_staff") {
    redirect("/billing");
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
    unstable_rethrow(error);

    console.error("Critical Exception caught during registration action execution:", error);
    return { 
      success: false, 
      error: "An unexpected runtime error occurred on the application server during submission." 
    };
  }
}

export async function firebaseLoginAction(
  email: string,
  password?: string,
  name?: string
): Promise<AuthActionResult> {
  try {
    const db = getDb();
    
    const { data: user, error } = await db
      .from("users")
      .select("id, is_active, role, password_hash")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      return { success: false, error: "No matching account found. Please register first." };
    }

    if (!user.is_active) {
      return { success: false, error: "Account is inactive." };
    }

    // If password is provided, verify it
    if (password) {
      const valid = await verifyPassword(password, user.password_hash || "");
      if (!valid) {
        return { success: false, error: "Invalid email or password." };
      }
    }

    const session = await buildSession(user.id);
    if (!session) {
      return { success: false, error: "Session creation failed." };
    }

    // Check maintenance mode
    const { data: settings } = await db
      .from("platform_settings")
      .select("maintenance_mode")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (settings?.maintenance_mode && session.role !== "central_admin") {
      return {
        success: false,
        error: "The platform is currently undergoing maintenance. Only central administrators are allowed to log in at this time.",
      };
    }

    const token = await createSessionToken(session);
    await setSessionCookie(token);

    // Determine redirect URL based on user role
    const redirectUrl = user.role === "central_admin" ? "/admin/dashboard" : "/dashboard";

    return { success: true, redirectUrl };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error in firebaseLoginAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected database or runtime error occurred." };
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

  if (session.shopId) {
    const { getDb } = await import("@/lib/supabase/server");
    const db = getDb();
    const { data: shop } = await db
      .from("shops")
      .select("verification_status, subscription_status, subscription_expires_at, auto_renew, is_suspended")
      .eq("id", session.shopId)
      .single();

    if (shop) {
      let currentStatus = shop.subscription_status;
      const expiresAt = shop.subscription_expires_at ? new Date(shop.subscription_expires_at) : null;
      
      // If subscription is active but expired
      if (currentStatus === "active" && expiresAt && expiresAt.getTime() < Date.now()) {
        if (!shop.auto_renew) {
          // Downgrade to trial status (Sandbox Trial Mode)
          currentStatus = "trial";
          await db
            .from("shops")
            .update({ subscription_status: "trial" })
            .eq("id", session.shopId);
        } else {
          // Auto-renew: extend by 1 month for simulation
          const newExpiry = new Date();
          newExpiry.setMonth(newExpiry.getMonth() + 1);
          await db
            .from("shops")
            .update({ subscription_expires_at: newExpiry.toISOString() })
            .eq("id", session.shopId);
        }
      }

      session.shopVerified = shop.verification_status === "approved";
      session.subscriptionStatus = currentStatus as any;
      session.isSuspended = !!shop.is_suspended;
    }
  }

  // Allow browsing in Trial Mode when verification is pending rather than blocking
  // if (!session.shopVerified) {
  //   redirect(ROUTES.shopPending);
  // }

  return session;
}