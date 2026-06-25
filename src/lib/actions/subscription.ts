"use server";

import { getDb } from "@/lib/supabase/server";

export async function getPublicPlansAction() {
  const db = getDb();
  const { data } = await db.from("subscription_plans").select("*").eq("is_active", true).order("price");
  return data ?? [];
}
