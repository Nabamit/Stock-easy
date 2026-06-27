"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";

const dealerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  gst_no: z.string().optional(),
});

export async function getDealersAction() {
  const { shopId } = await getShopContext();
  const db = getDb();

  const { data: dealers } = await db
    .from("dealers")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("name");

  const enriched = await Promise.all(
    (dealers ?? []).map(async (d) => {
      const { data: batches } = await db
        .from("batches")
        .select("cost_price, quantity_initial, quantity_remaining, expiry_date")
        .eq("dealer_id", d.id);

      let suppliedValue = 0;
      let expiredValue = 0;
      const now = new Date();

      for (const b of batches ?? []) {
        suppliedValue += Number(b.cost_price) * b.quantity_initial;
        if (new Date(b.expiry_date) < now && b.quantity_remaining > 0) {
          expiredValue += Number(b.cost_price) * b.quantity_remaining;
        }
      }

      return { ...d, suppliedValue, expiredValue };
    })
  );

  return enriched;
}

export async function createDealerAction(input: z.infer<typeof dealerSchema>) {
  const parsed = dealerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid dealer data" };

  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  // Enforce Subscription Limits
  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  const { count } = await db
    .from("dealers")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (count !== null && count >= limits.dealersLimit) {
    return {
      success: false,
      error: `Dealers limit of ${limits.dealersLimit} reached. Please upgrade your subscription plan.`,
    };
  }

  const { data, error } = await db
    .from("dealers")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
      shop_id: shopId,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/dealers");
  revalidatePath("/stock");
  return { success: true, data };
}

export async function updateDealerAction(dealerId: string, input: z.infer<typeof dealerSchema>) {
  const parsed = dealerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid dealer data" };

  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  const { error } = await db
    .from("dealers")
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
    })
    .eq("id", dealerId)
    .eq("shop_id", shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dealers");
  revalidatePath("/stock");
  return { success: true };
}

export async function deleteDealerAction(dealerId: string) {
  const { shopId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  // Soft delete dealer by setting is_active = false
  const { error } = await db
    .from("dealers")
    .update({ is_active: false })
    .eq("id", dealerId)
    .eq("shop_id", shopId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dealers");
  revalidatePath("/stock");
  return { success: true };
}
