"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";

const batchSchema = z.object({
  medicine_id: z.string().uuid(),
  dealer_id: z.string().uuid().optional().nullable(),
  batch_no: z.string().min(1),
  expiry_date: z.string(),
  quantity_initial: z.number().int().positive(),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  mrp: z.number().optional().nullable(),
});

export async function getBatchesAction(medicineId?: string) {
  const { shopId } = await getShopContext();
  const db = getDb();

  let q = db
    .from("batches")
    .select("*, medicines(name, generic_name), dealers(name)")
    .eq("shop_id", shopId)
    .order("expiry_date", { ascending: true });

  if (medicineId) q = q.eq("medicine_id", medicineId);

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message, data: [] };
  return { success: true as const, data: data ?? [] };
}

export async function createBatchAction(input: z.infer<typeof batchSchema>) {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid batch data" };

  const { shopId } = await getShopContext();
  const db = getDb();

  const { data, error } = await db
    .from("batches")
    .insert({
      ...parsed.data,
      shop_id: shopId,
      quantity_remaining: parsed.data.quantity_initial,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/stock");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true, data };
}

export async function getInventoryOverviewAction(filter?: "expiring" | "low" | "dead" | "all") {
  const { shopId } = await getShopContext();
  const db = getDb();

  const { data: batches } = await db
    .from("batches")
    .select("*, medicines(name, generic_name, min_stock_level)")
    .eq("shop_id", shopId)
    .gt("quantity_remaining", 0)
    .order("expiry_date", { ascending: true });

  const now = new Date();
  const items = batches ?? [];

  const medTotals: Record<string, { total: number; min: number; name: string }> = {};
  for (const b of items) {
    const med = b.medicines as { name: string; min_stock_level: number };
    if (!medTotals[b.medicine_id]) {
      medTotals[b.medicine_id] = { total: 0, min: med?.min_stock_level ?? 10, name: med?.name ?? "" };
    }
    medTotals[b.medicine_id].total += b.quantity_remaining;
  }

  const lowStockMedIds = new Set(
    Object.entries(medTotals).filter(([, v]) => v.total < v.min).map(([k]) => k)
  );

  let filtered = items.map((b) => {
    const days = Math.ceil(
      (new Date(b.expiry_date).getTime() - now.getTime()) / (86400000)
    );
    return { ...b, daysToExpiry: days };
  });

  if (filter === "expiring") {
    filtered = filtered.filter((b) => b.daysToExpiry <= 90 && b.daysToExpiry >= 0);
  } else if (filter === "low") {
    filtered = filtered.filter((b) => lowStockMedIds.has(b.medicine_id));
  } else if (filter === "dead") {
    // Only expired stock (dead / expired) — not safe long-dated batches
    filtered = filtered.filter((b) => b.daysToExpiry < 0);
  }

  return filtered;
}
