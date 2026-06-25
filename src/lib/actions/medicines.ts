"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";

const medicineSchema = z.object({
  name: z.string().min(1),
  generic_name: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default("strip"),
  hsn_code: z.string().default("3004"),
  gst_rate: z.number().default(5),
  min_stock_level: z.number().int().min(0).default(10),
  discount_cluster_id: z.string().uuid().optional().nullable(),
});

export async function getMedicinesAction(search?: string) {
  const { shopId } = await getShopContext();
  const db = getDb();
  let q = db
    .from("medicines")
    .select("*, discount_clusters(id, name, discount_percent)")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("name");

  if (search?.trim()) {
    q = q.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%`);
  }

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message, data: [] };

  const meds = data ?? [];
  const withStock = await Promise.all(
    meds.map(async (med) => {
      const { data: batches } = await db
        .from("batches")
        .select("quantity_remaining, expiry_date, selling_price")
        .eq("medicine_id", med.id)
        .gt("quantity_remaining", 0)
        .order("expiry_date", { ascending: true });

      const totalQty = (batches ?? []).reduce((s, b) => s + b.quantity_remaining, 0);
      const nearestExpiry = batches?.[0]?.expiry_date ?? null;
      return { ...med, totalQty, nearestExpiry };
    })
  );

  return { success: true as const, data: withStock };
}

export async function createMedicineAction(input: z.infer<typeof medicineSchema>) {
  const parsed = medicineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid medicine data" };

  const { shopId } = await getShopContext();
  const db = getDb();

  const { data, error } = await db
    .from("medicines")
    .insert({ ...parsed.data, shop_id: shopId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/medicines");
  revalidatePath("/stock");
  return { success: true, data };
}

export async function getDiscountClustersAction() {
  const { shopId } = await getShopContext();
  const db = getDb();
  const { data } = await db
    .from("discount_clusters")
    .select("*")
    .eq("shop_id", shopId)
    .order("discount_percent");
  return data ?? [];
}

export async function ensureDefaultClustersAction() {
  const { shopId } = await getShopContext();
  const db = getDb();
  const { count } = await db
    .from("discount_clusters")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  if ((count ?? 0) > 0) return;

  await db.from("discount_clusters").insert([
    { shop_id: shopId, name: "Cluster A (15%)", discount_percent: 15 },
    { shop_id: shopId, name: "Cluster B (20%)", discount_percent: 20 },
    { shop_id: shopId, name: "Cluster C (25%)", discount_percent: 25 },
  ]);
}

export async function searchMedicinesFefoAction(query: string) {
  const { shopId } = await getShopContext();
  const db = getDb();

  const { data: medicines } = await db
    .from("medicines")
    .select("*, discount_clusters(id, name, discount_percent)")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%`)
    .limit(10);

  if (!medicines?.length) return [];

  const results = await Promise.all(
    medicines.map(async (med) => {
      const { data: batches } = await db
        .from("batches")
        .select("*, dealers(name)")
        .eq("medicine_id", med.id)
        .eq("shop_id", shopId)
        .gt("quantity_remaining", 0)
        .order("expiry_date", { ascending: true });

      const cluster = med.discount_clusters as { discount_percent: number } | null;
      return {
        ...med,
        defaultDiscount: cluster?.discount_percent ?? 0,
        batches: batches ?? [],
        recommendedBatchId: batches?.[0]?.id ?? null,
      };
    })
  );

  return results.filter((m) => m.batches.length > 0);
}
