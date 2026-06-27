"use server";

import { getDb } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

// Server action to create a platform notification (Database Announcement)
export async function createPlatformNotificationAction(
  recipientType: "all" | "admin" | "owner" | "custom",
  recipientEmail: string | null,
  title: string,
  message: string
) {
  const session = await getSession();
  if (!session || session.role !== "central_admin") {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  const db = getDb();

  const { error } = await db.from("platform_notifications").insert({
    sender_id: session.userId,
    recipient_type: recipientType,
    recipient_email: recipientEmail || null,
    title,
    message,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "In-app notification created successfully!" };
}

// Server action to fetch notifications for the current logged-in user
export async function getUserNotificationsAction() {
  const session = await getSession();
  if (!session) return [];

  const db = getDb();
  const userRole = session.role; 
  const email = session.email;

  const mappedTypes = ["all"];
  if (userRole === "central_admin") {
    mappedTypes.push("admin");
  } else {
    mappedTypes.push("owner");
  }

  // Fetch all matching notifications
  const { data: notifications, error } = await db
    .from("platform_notifications")
    .select("*")
    .or(`recipient_type.in.(${mappedTypes.join(",")}),recipient_email.eq.${email}`)
    .order("created_at", { ascending: false });

  if (error || !notifications) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  // Fetch read receipts for this user
  const { data: readReceipts } = await db
    .from("platform_notification_reads")
    .select("notification_id")
    .eq("user_id", session.userId);

  const readIds = new Set(readReceipts?.map((r) => r.notification_id) || []);

  return notifications.map((n) => ({
    id: n.id,
    senderId: n.sender_id,
    recipientType: n.recipient_type,
    recipientEmail: n.recipient_email,
    title: n.title,
    message: n.message,
    createdAt: n.created_at,
    isRead: readIds.has(n.id),
  }));
}

// Server action to mark a single notification as read
export async function markNotificationAsReadAction(notificationId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const db = getDb();
  const { error } = await db.from("platform_notification_reads").upsert(
    {
      user_id: session.userId,
      notification_id: notificationId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "user_id,notification_id" }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Server action to mark all notifications as read
export async function markAllNotificationsAsReadAction() {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const db = getDb();
  
  const userNotifications = await getUserNotificationsAction();
  const unreadNotifications = userNotifications.filter((n) => !n.isRead);

  if (unreadNotifications.length === 0) {
    return { success: true };
  }

  const inserts = unreadNotifications.map((n) => ({
    user_id: session.userId,
    notification_id: n.id,
    read_at: new Date().toISOString(),
  }));

  const { error } = await db.from("platform_notification_reads").upsert(inserts, {
    onConflict: "user_id,notification_id",
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
