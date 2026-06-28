"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/actions";

// Approve shop registration with reviewer details and mock email
export async function approveShopAction(shopId: string) {
  const session = await requireAdminSession();
  const db = getDb();

  const { error } = await db
    .from("shops")
    .update({
      verification_status: "approved",
      verified_at: new Date().toISOString(),
      verified_by: session.userId,
      subscription_status: "active",
    })
    .eq("id", shopId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Fetch shop & owner details to notify via email
  const { data: shop } = await db
    .from("shops")
    .select("name, owner_name, subscription_plans(name)")
    .eq("id", shopId)
    .single();
  const { data: owner } = await db.from("users").select("email").eq("shop_id", shopId).eq("role", "shop_owner").maybeSingle();
  const ownerEmail = owner?.email || "owner@stockeasy.in";
  const planName = (shop?.subscription_plans as any)?.name || "Starter";

  const { sendEmail } = await import("@/lib/mail");
  await sendEmail({
    to: ownerEmail,
    subject: "Pharmacy Registration Approved!",
    body: `Hello ${shop?.owner_name || "Owner"},\n\nThank you for choosing us. Your account is now active with the ${planName} plan.`,
  });

  revalidatePath("/admin/verification");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/shops");
  return { success: true };
}

// Reject shop registration with reviewer details, custom notes, and mock email
export async function rejectShopAction(shopId: string, notes?: string) {
  const session = await requireAdminSession();
  const db = getDb();

  const { error } = await db
    .from("shops")
    .update({
      verification_status: "rejected",
      verification_notes: notes ?? "Rejected by admin",
      verified_at: new Date().toISOString(),
      verified_by: session.userId,
    })
    .eq("id", shopId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Fetch shop & owner details to notify via email
  const { data: shop } = await db.from("shops").select("name, owner_name").eq("id", shopId).single();
  const { data: owner } = await db.from("users").select("email").eq("shop_id", shopId).eq("role", "shop_owner").maybeSingle();
  const ownerEmail = owner?.email || "owner@stockeasy.in";

  const { sendEmail } = await import("@/lib/mail");
  await sendEmail({
    to: ownerEmail,
    subject: "Pharmacy Registration Rejected",
    body: `Dear ${shop?.owner_name || "Owner"},\n\nUnfortunately, your pharmacy registration for "${shop?.name || "Shop"}" was not approved.\n\nReason: ${notes || "Details provided could not be verified."}\n\nPlease review your details or contact support for help.\n\nRegards,\nStockEasy Team`,
  });

  revalidatePath("/admin/verification");
  revalidatePath("/admin/shops");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// Check admin sub-role (Super Admin vs Regular Admin)
export async function getAdminRoleAction() {
  const session = await requireAdminSession();
  const db = getDb();
  const { data: user } = await db
    .from("users")
    .select("is_super")
    .eq("id", session.userId)
    .single();
  
  return {
    isSuper: user?.is_super ?? false,
    userId: session.userId,
    name: session.name,
    email: session.email,
  };
}

// Toggle Server-wide Maintenance Mode (Super Admin only)
export async function toggleMaintenanceModeAction(enabled: boolean) {
  const session = await requireAdminSession();
  const db = getDb();

  // Verify Super Admin
  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();
  if (!user?.is_super) {
    return { success: false, error: "Unauthorized. Super Admin only." };
  }

  const { error } = await db
    .from("platform_settings")
    .update({ maintenance_mode: enabled })
    .eq("id", "00000000-0000-0000-0000-000000000001");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/maintenance");
  return { success: true };
}

// Fetch platform settings (e.g. maintenance status)
export async function getPlatformSettingsAction() {
  await requireAdminSession();
  const db = getDb();
  const { data } = await db
    .from("platform_settings")
    .select("*")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .single();
  return data;
}

// Onboard regular admin (Super Admin only)
export async function createRegularAdminAction(name: string, email: string, passwordText: string) {
  const session = await requireAdminSession();
  const db = getDb();

  // Verify Super Admin
  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();
  if (!user?.is_super) {
    return { success: false, error: "Unauthorized. Super Admin only." };
  }

  const { hashPassword } = await import("@/lib/auth/password");
  const password_hash = await hashPassword(passwordText);

  const { error } = await db.from("users").insert({
    name,
    email: email.toLowerCase(),
    password_hash,
    role: "central_admin",
    is_super: false,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

// Admin Onboarding Leaderboard (counts verified shops per admin)
export async function getAdminLeaderboardAction() {
  await requireAdminSession();
  const db = getDb();

  // Query all central admins
  const { data: admins } = await db
    .from("users")
    .select("id, name, email, is_super")
    .eq("role", "central_admin");

  // Query approved/rejected shops
  const { data: shops } = await db
    .from("shops")
    .select("verified_by")
    .not("verified_by", "is", null);

  const counts: Record<string, number> = {};
  for (const s of shops ?? []) {
    if (s.verified_by) {
      counts[s.verified_by] = (counts[s.verified_by] ?? 0) + 1;
    }
  }

  const leaderboard = (admins ?? []).map((admin) => ({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isSuper: admin.is_super,
    count: counts[admin.id] ?? 0,
  })).sort((a, b) => b.count - a.count);

  return leaderboard;
}

// Get verification history (reviewed shops, reviewer name, status, notes)
export async function getVerificationHistoryAction() {
  await requireAdminSession();
  const db = getDb();

  const { data, error } = await db
    .from("shops")
    .select("*, verifier:users!verified_by(name, email)")
    .neq("verification_status", "pending")
    .order("verified_at", { ascending: false });

  if (error) {
    return [];
  }
  return data ?? [];
}

// Admin tasks actions (regular admins see their own, super admins see all)
export async function getAdminTasksAction() {
  const session = await requireAdminSession();
  const db = getDb();
  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();

  let query = db.from("admin_tasks").select("*, assigned_to:users!admin_id(name, email), creator:users!created_by(name)");

  if (!user?.is_super) {
    query = query.eq("admin_id", session.userId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    return [];
  }
  return data ?? [];
}

// Create admin task (Super Admin only)
export async function createAdminTaskAction(adminId: string, description: string) {
  const session = await requireAdminSession();
  const db = getDb();

  // Verify Super Admin
  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();
  if (!user?.is_super) {
    return { success: false, error: "Unauthorized. Super Admin only." };
  }

  const { error } = await db.from("admin_tasks").insert({
    admin_id: adminId,
    task_description: description,
    status: "pending",
    created_by: session.userId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

// Toggle admin task completion status
export async function toggleAdminTaskStatusAction(taskId: string, currentStatus: "pending" | "completed") {
  const session = await requireAdminSession();
  const db = getDb();

  // Check assignment
  const { data: task } = await db.from("admin_tasks").select("admin_id").eq("id", taskId).single();
  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();

  if (task?.admin_id !== session.userId && !user?.is_super) {
    return { success: false, error: "Unauthorized. Task is not assigned to you." };
  }

  const newStatus = currentStatus === "pending" ? "completed" : "pending";
  const { error } = await db.from("admin_tasks").update({ status: newStatus }).eq("id", taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

// Send chat message (receiverId is null for general broadcast)
export async function sendChatMessageAction(message: string, receiverId?: string) {
  const session = await requireAdminSession();
  const db = getDb();

  const { error } = await db.from("chat_messages").insert({
    sender_id: session.userId,
    receiver_id: receiverId || null,
    message,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

// Fetch chat messages (broadcast or 1:1)
export async function getChatMessagesAction(otherUserId?: string) {
  const session = await requireAdminSession();
  const db = getDb();

  let query = db.from("chat_messages").select("*, sender:users!sender_id(name), receiver:users!receiver_id(name)");

  if (otherUserId) {
    query = query.or(
      `and(sender_id.eq.${session.userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${session.userId})`
    );
  } else {
    query = query.is("receiver_id", null);
  }

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) {
    return [];
  }
  return data ?? [];
}

// Get all admin accounts
export async function getAdminUsersAction() {
  await requireAdminSession();
  const db = getDb();
  const { data } = await db
    .from("users")
    .select("id, name, email, is_super")
    .eq("role", "central_admin")
    .order("name");
  return data ?? [];
}

export async function deleteAdminAction(adminUserId: string) {
  const session = await requireAdminSession();
  const db = getDb();
  
  // Verify Super Admin
  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();
  if (!user?.is_super) {
    return { success: false, error: "Unauthorized. Super Admin only." };
  }

  // Do not allow deleting self
  if (adminUserId === session.userId) {
    return { success: false, error: "Cannot delete your own super admin account." };
  }

  const { error } = await db.from("users").delete().eq("id", adminUserId);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function editAdminAction(adminUserId: string, name: string, email: string) {
  const session = await requireAdminSession();
  const db = getDb();

  // Verify Super Admin
  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();
  if (!user?.is_super) {
    return { success: false, error: "Unauthorized. Super Admin only." };
  }

  const { error } = await db.from("users").update({ name, email: email.toLowerCase() }).eq("id", adminUserId);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function sendAdminEmailAction(toEmail: string, subject: string, body: string) {
  const session = await requireAdminSession();
  const { sendEmail } = await import("@/lib/mail");
  
  const res = await sendEmail({
    to: toEmail,
    subject,
    body,
    html: `
      <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #333;">
        <h2>StockEasy Platform Notification</h2>
        <p><strong>From:</strong> Platform Admin (${session.name} / ${session.email})</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <div style="white-space: pre-wrap;">${body}</div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #888;">This is a system broadcast from the StockEasy Administration portal.</p>
      </div>
    `,
  });

  return res;
}

export async function getShopOwnersAction() {
  await requireAdminSession();
  const db = getDb();
  const { data } = await db
    .from("users")
    .select("id, name, email, shop_id")
    .eq("role", "shop_owner")
    .order("name");
  return data ?? [];
}

export async function editShopAction(
  shopId: string,
  name: string,
  ownerName: string,
  phone: string,
  city: string,
  state: string,
  isActive: boolean,
  subscriptionStatus: string,
  subscriptionPlanId: string | null
) {
  const session = await requireAdminSession();
  const db = getDb();

  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();
  if (!user?.is_super) {
    return { success: false, error: "Unauthorized. Super Admin only." };
  }

  const { error } = await db
    .from("shops")
    .update({
      name,
      owner_name: ownerName,
      phone,
      city,
      state,
      is_active: isActive,
      subscription_status: subscriptionStatus,
      subscription_plan_id: subscriptionPlanId || null,
    })
    .eq("id", shopId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/shops");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteShopAction(shopId: string) {
  const session = await requireAdminSession();
  const db = getDb();

  const { data: user } = await db.from("users").select("is_super").eq("id", session.userId).single();
  if (!user?.is_super) {
    return { success: false, error: "Unauthorized. Super Admin only." };
  }

  // Delete associated users for the shop to prevent constraint violations
  await db.from("users").delete().eq("shop_id", shopId);

  const { error } = await db.from("shops").delete().eq("id", shopId);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/shops");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function broadcastPlatformEmailAction(
  recipientType: "all" | "admin" | "owner",
  subject: string,
  body: string
) {
  const session = await requireAdminSession();
  const db = getDb();

  // Fetch recipient emails
  let query = db.from("users").select("email");
  if (recipientType === "admin") {
    query = query.eq("role", "central_admin");
  } else if (recipientType === "owner") {
    query = query.eq("role", "shop_owner");
  } else {
    query = query.in("role", ["central_admin", "shop_owner"]);
  }

  const { data: users, error } = await query;
  if (error || !users) {
    return { success: false, error: error?.message || "Failed to fetch recipients" };
  }

  const { sendEmail } = await import("@/lib/mail");
  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    if (!user.email) continue;
    const res = await sendEmail({
      to: user.email,
      subject,
      body,
      html: `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.5; color: #333;">
          <h2>StockEasy Platform Broadcast</h2>
          <p><strong>From:</strong> Platform Admin (${session.name})</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <div style="white-space: pre-wrap;">${body}</div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #888;">This is a system broadcast from the StockEasy Administration portal.</p>
        </div>
      `,
    });
    if (res.success) successCount++;
    else failCount++;
  }

  return {
    success: true,
    message: `Broadcast complete. Sent ${successCount} emails successfully, ${failCount} failed.`,
  };
}

export async function toggleShopSuspensionAction(shopId: string, suspend: boolean) {
  const session = await requireAdminSession();
  const db = getDb();

  const { error } = await db
    .from("shops")
    .update({
      is_suspended: suspend,
    })
    .eq("id", shopId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Get owner details to send email notification
  const { data: shop } = await db.from("shops").select("name, owner_name").eq("id", shopId).single();
  const { data: owner } = await db.from("users").select("email").eq("shop_id", shopId).eq("role", "shop_owner").maybeSingle();
  const ownerEmail = owner?.email || "owner@stockeasy.in";

  const { sendEmail } = await import("@/lib/mail");
  if (suspend) {
    await sendEmail({
      to: ownerEmail,
      subject: "Account Suspended - StockEasy",
      body: `Dear ${shop?.owner_name || "Owner"},\n\nWe regret to inform you that your shop account "${shop?.name || "Shop"}" has been suspended by the administrator because it violated our terms and conditions.\n\nAll features are locked. Only Customer Support remains available.\n\nRegards,\nStockEasy Admin Team`,
    });
  } else {
    await sendEmail({
      to: ownerEmail,
      subject: "Account Suspension Revoked - StockEasy",
      body: `Dear ${shop?.owner_name || "Owner"},\n\nWe are pleased to inform you that the suspension on your shop account "${shop?.name || "Shop"}" has been revoked. You now have full access to your account and subscription tier.\n\nRegards,\nStockEasy Admin Team`,
    });
  }

  revalidatePath("/admin/shops");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
