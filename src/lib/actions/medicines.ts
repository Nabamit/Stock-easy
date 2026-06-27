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

export async function getMedicinesAction(search?: string, batchSearch?: string) {
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
  const rows: any[] = [];

  for (const med of meds) {
    let batchQuery = db
      .from("batches")
      .select("*, dealers(id, name)")
      .eq("medicine_id", med.id);

    if (batchSearch?.trim()) {
      batchQuery = batchQuery.ilike("batch_no", `%${batchSearch}%`);
    }

    const { data: batches } = await batchQuery.order("expiry_date", { ascending: true });

    if (batches && batches.length > 0) {
      for (const batch of batches) {
        rows.push({
          ...med,
          batchId: batch.id,
          batchNo: batch.batch_no,
          quantityRemaining: batch.quantity_remaining,
          expiryDate: batch.expiry_date,
          costPrice: batch.cost_price,
          sellingPrice: batch.selling_price,
          dealerName: batch.dealers?.name ?? "—",
        });
      }
    } else {
      // If batch search is active and no batch matches, skip this medicine row
      if (!batchSearch?.trim()) {
        rows.push({
          ...med,
          batchId: null,
          batchNo: "—",
          quantityRemaining: 0,
          expiryDate: null,
          costPrice: 0,
          sellingPrice: 0,
          dealerName: "—",
        });
      }
    }
  }

  return { success: true as const, data: rows };
}

export async function createMedicineAction(input: z.infer<typeof medicineSchema>) {
  const parsed = medicineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid medicine data" };

  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  // Enforce Subscription Limits
  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  const { count } = await db
    .from("medicines")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (count !== null && count >= limits.medicineSkuLimit) {
    return {
      success: false,
      error: `Medicine SKU limit of ${limits.medicineSkuLimit} types reached. Please upgrade your subscription plan.`,
    };
  }

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

export async function updateMedicineAction(medicineId: string, input: z.infer<typeof medicineSchema>) {
  const parsed = medicineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid medicine data" };

  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  const { error } = await db
    .from("medicines")
    .update({ ...parsed.data })
    .eq("id", medicineId)
    .eq("shop_id", shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/medicines");
  revalidatePath("/stock");
  return { success: true };
}

export async function deleteMedicineAction(medicineId: string) {
  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  // Soft delete by setting is_active = false
  const { error } = await db
    .from("medicines")
    .update({ is_active: false })
    .eq("id", medicineId)
    .eq("shop_id", shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/medicines");
  revalidatePath("/stock");
  return { success: true };
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

  const todayStr = new Date().toISOString().split("T")[0];

  const results = await Promise.all(
    medicines.map(async (med) => {
      // FEFO suggestion: filter out expired batches entirely
      const { data: batches } = await db
        .from("batches")
        .select("*, dealers(name)")
        .eq("medicine_id", med.id)
        .eq("shop_id", shopId)
        .gt("quantity_remaining", 0)
        .gt("expiry_date", todayStr) // must not be already expired
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

export async function getFefoSuggestionsAction() {
  const { shopId } = await getShopContext();
  const db = getDb();
  const todayStr = new Date().toISOString().split("T")[0];
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
  const ninetyDaysStr = ninetyDaysFromNow.toISOString().split("T")[0];

  // Fetch all active batches for the shop
  const { data: batches } = await db
    .from("batches")
    .select("*, medicines(*)")
    .eq("shop_id", shopId)
    .gt("quantity_remaining", 0)
    .gt("expiry_date", todayStr) // do not suggest already expired
    .order("expiry_date", { ascending: true });

  const medStock: Record<string, { totalQty: number; nearestExpiry: string | null; medicine: any }> = {};
  for (const b of batches ?? []) {
    const medId = b.medicine_id;
    if (!medStock[medId]) {
      medStock[medId] = { totalQty: 0, nearestExpiry: b.expiry_date, medicine: b.medicines };
    }
    medStock[medId].totalQty += b.quantity_remaining;
    if (new Date(b.expiry_date) < new Date(medStock[medId].nearestExpiry!)) {
      medStock[medId].nearestExpiry = b.expiry_date;
    }
  }

  const suggestions = Object.values(medStock)
    .filter((m) => {
      // Suggest if low stock (<20 units) OR nearing expiry (<=90 days left)
      const isLowStock = m.totalQty < 20;
      const isNearingExpiry = m.nearestExpiry && m.nearestExpiry <= ninetyDaysStr;
      return isLowStock || isNearingExpiry;
    })
    .map((m) => ({
      id: m.medicine.id,
      name: m.medicine.name,
      genericName: m.medicine.generic_name,
      totalQty: m.totalQty,
      nearestExpiry: m.nearestExpiry,
      status: m.totalQty < 20 ? "Low Stock" : "Nearing Expiry",
    }));

  return suggestions;
}
