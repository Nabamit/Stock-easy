"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/actions";

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

  revalidatePath("/admin/verification");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/shops");
  return { success: true };
}

export async function rejectShopAction(shopId: string, notes?: string) {
  await requireAdminSession();
  const db = getDb();

  const { error } = await db
    .from("shops")
    .update({
      verification_status: "rejected",
      verification_notes: notes ?? "Rejected by admin",
    })
    .eq("id", shopId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/verification");
  revalidatePath("/admin/shops");
  return { success: true };
}
