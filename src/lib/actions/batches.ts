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

const updateBatchSchema = z.object({
  batch_no: z.string().min(1),
  expiry_date: z.string(),
  quantity_remaining: z.number().int().min(0),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  dealer_id: z.string().uuid().optional().nullable(),
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

  const { shopId, session } = await getShopContext();
  const db = getDb();

  const isTrial = !session.shopVerified || (session as any).subscriptionStatus === "trial";

  if (isTrial) {
    const { count: totalBatches } = await db
      .from("batches")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId);

    if (totalBatches !== null && totalBatches >= 5) {
      return {
        success: false,
        error: "Trial Mode Limit Reached: 5 batches max. Please upgrade/renew your subscription or wait for verification approval.",
      };
    }
  } else {
    // Enforce Subscription Limits
    const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
    const limits = await getShopSubscriptionLimit(shopId);

    // Count batches added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await db
      .from("batches")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .gte("created_at", startOfMonth.toISOString());

    if (count !== null && count >= limits.monthlyStockEntriesLimit) {
      // FIFO: drop oldest batch
      const { data: oldestBatch } = await db
        .from("batches")
        .select("id")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (oldestBatch) {
        await db.from("batches").delete().eq("id", oldestBatch.id);
      }
    }
  }

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

export async function updateBatchAction(batchId: string, input: z.infer<typeof updateBatchSchema>) {
  const parsed = updateBatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid batch data" };

  const { shopId, session } = await getShopContext();
  const db = getDb();

  const { error } = await db
    .from("batches")
    .update({
      ...parsed.data,
      dealer_id: parsed.data.dealer_id || null,
    })
    .eq("id", batchId)
    .eq("shop_id", shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/stock");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBatchAction(batchId: string) {
  const { shopId, session } = await getShopContext();
  const db = getDb();

  const { error } = await db
    .from("batches")
    .delete()
    .eq("id", batchId)
    .eq("shop_id", shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/stock");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getInventoryOverviewAction(filter?: "expiring" | "low" | "dead" | "all") {
  const { shopId } = await getShopContext();
  const db = getDb();

  // Fetch both active medicines and active batches
  const [medRes, batchRes] = await Promise.all([
    db
      .from("medicines")
      .select("id, name, generic_name, min_stock_level")
      .eq("shop_id", shopId)
      .eq("is_active", true),
    db
      .from("batches")
      .select("*, medicines(name, generic_name, min_stock_level)")
      .eq("shop_id", shopId)
      .gt("quantity_remaining", 0)
      .order("expiry_date", { ascending: true })
  ]);

  const medicines = medRes.data ?? [];
  const batches = batchRes.data ?? [];
  const now = new Date();

  // Calculate total stock per medicine
  const medStock: Record<string, { total: number; min: number }> = {};
  for (const m of medicines) {
    medStock[m.id] = { total: 0, min: m.min_stock_level ?? 10 };
  }
  for (const b of batches) {
    if (medStock[b.medicine_id]) {
      medStock[b.medicine_id].total += b.quantity_remaining;
    }
  }

  // Map active batches
  const mappedBatches = batches.map((b) => {
    const days = Math.ceil(
      (new Date(b.expiry_date).getTime() - now.getTime()) / 86400000
    );
    const minStock = medStock[b.medicine_id]?.min ?? 10;
    return {
      ...b,
      daysToExpiry: days,
      isLowStock: b.quantity_remaining < minStock,
      isOutOfStock: false,
    };
  });

  // Synthesize virtual items for medicines that are completely out of stock (total stock = 0)
  // and are considered low stock (0 < min_stock_level, which is always true since min_stock_level >= 1)
  const virtualOutOfStockItems = medicines
    .filter((m) => {
      const stock = medStock[m.id];
      return stock && stock.total === 0 && stock.total < stock.min;
    })
    .map((m) => ({
      id: `out-${m.id}`,
      shop_id: shopId,
      medicine_id: m.id,
      dealer_id: null,
      batch_no: "—",
      expiry_date: "",
      quantity_initial: 0,
      quantity_remaining: 0,
      cost_price: 0,
      selling_price: 0,
      created_at: new Date().toISOString(),
      medicines: {
        name: m.name,
        generic_name: m.generic_name,
        min_stock_level: m.min_stock_level,
      },
      daysToExpiry: null,
      isLowStock: true,
      isOutOfStock: true,
    }));

  let filtered = [...mappedBatches, ...virtualOutOfStockItems];

  if (filter === "expiring") {
    filtered = filtered.filter((b) => b.daysToExpiry !== null && b.daysToExpiry <= 90 && b.daysToExpiry >= 0);
  } else if (filter === "low") {
    filtered = filtered.filter((b) => b.isLowStock);
  } else if (filter === "dead") {
    filtered = filtered.filter((b) => b.daysToExpiry !== null && b.daysToExpiry < 0);
  } else {
    // For 'all' or undefined, exclude virtual out-of-stock items so they don't clutter the main view
    filtered = filtered.filter((b) => !b.isOutOfStock);
  }

  return filtered;
}

export async function bulkImportBatchesAction(rows: any[]) {
  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  // Enforce limits checks prior to bulk import
  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  let importedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    try {
      const batchNo = (row.Batch || row.batch || "").trim();
      const medName = (row.Medicine || row.medicine || "").trim();
      const genericName = (row["Generic Name"] || row.generic_name || "").trim();
      const manufacturer = (row.Manufacturer || row.manufacturer || "").trim();
      const category = (row.Category || row.category || "").trim();
      const clusterName = (row["Discount Cluster"] || row.discount_cluster || "").trim();
      const dealerName = (row.Dealer || row.dealer || "").trim();
      const expiry = (row.Expiry || row.expiry || "").trim();
      const qty = parseInt(row.Qty || row.qty || "0") || 0;
      const costPrice = parseFloat(row["Cost Price"] || row.cost_price || "0") || 0;
      const sellingPrice = parseFloat(row["Selling Price"] || row.selling_price || "0") || 0;

      if (!batchNo || !medName || !expiry || qty <= 0) {
        errorCount++;
        continue;
      }

      // Check current medicine count against subscription limits
      const { count: medCount } = await db
        .from("medicines")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .eq("is_active", true);

      // Find or create medicine
      let { data: med } = await db
        .from("medicines")
        .select("id")
        .eq("shop_id", shopId)
        .eq("name", medName)
        .maybeSingle();

      if (!med) {
        if (medCount !== null && medCount >= limits.medicineSkuLimit) {
          errorCount++;
          continue; // skip due to subscription limit
        }

        // Find discount cluster if name provided
        let clusterId: string | null = null;
        if (clusterName) {
          const { data: cluster } = await db
            .from("discount_clusters")
            .select("id")
            .eq("shop_id", shopId)
            .eq("name", clusterName)
            .maybeSingle();
          if (cluster) clusterId = cluster.id;
        }

        const { data: newMed, error: medErr } = await db
          .from("medicines")
          .insert({
            shop_id: shopId,
            name: medName,
            generic_name: genericName || null,
            manufacturer: manufacturer || null,
            category: category || null,
            discount_cluster_id: clusterId,
            unit: "strip",
            hsn_code: "3004",
            gst_rate: 5.0,
            min_stock_level: 10,
          })
          .select("id")
          .single();

        if (medErr || !newMed) {
          errorCount++;
          continue;
        }
        med = newMed;
      }

      // Find or create dealer
      let dealerId: string | null = null;
      if (dealerName) {
        let { data: dealer } = await db
          .from("dealers")
          .select("id")
          .eq("shop_id", shopId)
          .eq("name", dealerName)
          .maybeSingle();

        if (!dealer) {
          // Check dealer count against limits before inserting
          const { count: dlCount } = await db
            .from("dealers")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", shopId)
            .eq("is_active", true);

          if (dlCount === null || dlCount < limits.dealersLimit) {
            const { data: newDealer, error: dealerErr } = await db
              .from("dealers")
              .insert({
                shop_id: shopId,
                name: dealerName,
              })
              .select("id")
              .single();

            if (!dealerErr && newDealer) {
              dealerId = newDealer.id;
            }
          }
        } else {
          dealerId = dealer.id;
        }
      }

      // Check current monthly batch count limits before insertion
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: mBatchCount } = await db
        .from("batches")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId)
        .gte("created_at", startOfMonth.toISOString());

      if (mBatchCount !== null && mBatchCount >= limits.monthlyStockEntriesLimit) {
        // FIFO queue: drop oldest batch
        const { data: oldestBatch } = await db
          .from("batches")
          .select("id")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (oldestBatch) {
          await db.from("batches").delete().eq("id", oldestBatch.id);
        }
      }

      // Check if batch already exists for this medicine in this shop
      const { data: existingBatch } = await db
        .from("batches")
        .select("id")
        .eq("shop_id", shopId)
        .eq("medicine_id", med.id)
        .eq("batch_no", batchNo)
        .maybeSingle();

      if (existingBatch) {
        await db
          .from("batches")
          .update({
            quantity_initial: qty,
            quantity_remaining: qty,
            cost_price: costPrice,
            selling_price: sellingPrice,
            expiry_date: expiry,
            dealer_id: dealerId,
          })
          .eq("id", existingBatch.id);
      } else {
        const { error: batchErr } = await db.from("batches").insert({
          shop_id: shopId,
          medicine_id: med.id,
          batch_no: batchNo,
          expiry_date: expiry,
          quantity_initial: qty,
          quantity_remaining: qty,
          cost_price: costPrice,
          selling_price: sellingPrice,
          dealer_id: dealerId,
        });

        if (batchErr) {
          errorCount++;
          continue;
        }
      }

      importedCount++;
    } catch (e) {
      errorCount++;
    }
  }

  revalidatePath("/stock");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true, importedCount, errorCount };
}
