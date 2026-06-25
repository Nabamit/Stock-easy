"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";
import { GST_CGST_RATE, GST_SGST_RATE } from "@/lib/constants";

export async function getBillsHistoryAction(search?: string) {
  const { shopId } = await getShopContext();
  const db = getDb();

  let q = db
    .from("bills")
    .select("*, bill_items(count)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (search?.trim()) {
    q = q.or(`bill_no.ilike.%${search}%,customer_name.ilike.%${search}%`);
  }

  const { data } = await q;
  return data ?? [];
}

export async function processReturnAction(
  billId: string,
  returnItems: { billItemId: string; quantity: number }[]
) {
  const { shopId, userId } = await getShopContext();
  const db = getDb();

  const { data: originalBill } = await db
    .from("bills")
    .select("*")
    .eq("id", billId)
    .eq("shop_id", shopId)
    .single();

  if (!originalBill || originalBill.is_return) {
    return { success: false, error: "Invalid bill for return" };
  }

  const { data: billNoData } = await db.rpc("generate_bill_no", { p_shop_id: shopId });
  const billNo = billNoData as string;

  let totalReturn = 0;
  const newItems: Array<Record<string, unknown>> = [];

  for (const ret of returnItems) {
    if (ret.quantity <= 0) continue;

    const { data: item } = await db
      .from("bill_items")
      .select("*")
      .eq("id", ret.billItemId)
      .eq("bill_id", billId)
      .single();

    if (!item || ret.quantity > item.quantity) {
      return { success: false, error: "Invalid return quantity" };
    }

    const ratio = ret.quantity / item.quantity;
    const returnTotal = Number(item.line_total) * ratio;
    totalReturn += returnTotal;

    newItems.push({
      shop_id: shopId,
      medicine_id: item.medicine_id,
      batch_id: item.batch_id,
      medicine_name: item.medicine_name,
      batch_no: item.batch_no,
      expiry_date: item.expiry_date,
      quantity: ret.quantity,
      unit_price: item.unit_price,
      discount_amount: Number(item.discount_amount) * ratio,
      discount_percent: item.discount_percent,
      gst_rate: item.gst_rate,
      cgst_amount: Number(item.cgst_amount) * ratio,
      sgst_amount: Number(item.sgst_amount) * ratio,
      line_total: returnTotal,
    });

    const { data: batch } = await db
      .from("batches")
      .select("quantity_remaining")
      .eq("id", item.batch_id)
      .single();

    if (batch) {
      await db
        .from("batches")
        .update({ quantity_remaining: batch.quantity_remaining + ret.quantity })
        .eq("id", item.batch_id);
    }
  }

  if (!newItems.length) return { success: false, error: "No items to return" };

  const { data: returnBill, error } = await db
    .from("bills")
    .insert({
      shop_id: shopId,
      bill_no: billNo,
      customer_name: originalBill.customer_name,
      subtotal: totalReturn,
      total_amount: -totalReturn,
      taxable_amount: totalReturn,
      cgst_amount: totalReturn * (GST_CGST_RATE / 100),
      sgst_amount: totalReturn * (GST_SGST_RATE / 100),
      payment_mode: "return",
      is_return: true,
      original_bill_id: billId,
      created_by: userId,
    })
    .select()
    .single();

  if (error || !returnBill) return { success: false, error: error?.message };

  for (const line of newItems) {
    await db.from("bill_items").insert({ ...line, bill_id: returnBill.id });
  }

  revalidatePath("/bills");
  revalidatePath("/inventory");
  return { success: true, returnBillId: returnBill.id };
}

export async function getBillWithItemsAction(billId: string) {
  const { shopId } = await getShopContext();
  const db = getDb();

  const { data: bill } = await db.from("bills").select("*").eq("id", billId).eq("shop_id", shopId).single();
  const { data: items } = await db.from("bill_items").select("*").eq("bill_id", billId);
  return { bill, items: items ?? [] };
}
