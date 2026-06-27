"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";
import { GST_CGST_RATE, GST_SGST_RATE } from "@/lib/constants";

const cartItemSchema = z.object({
  medicineId: z.string().uuid(),
  batchId: z.string().uuid(),
  quantity: z.number().int().positive(),
  discountPercent: z.number().min(0).max(100).default(0),
});

const createBillSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  doctorName: z.string().optional(),
  paymentMode: z.string().default("cash"),
  items: z.array(cartItemSchema).min(1),
});

function calcLine(unitPrice: number, qty: number, discountPercent: number) {
  const subtotal = unitPrice * qty;
  const discountAmount = subtotal * (discountPercent / 100);
  const taxable = subtotal - discountAmount;
  const cgst = taxable * (GST_CGST_RATE / 100);
  const sgst = taxable * (GST_SGST_RATE / 100);
  const lineTotal = taxable + cgst + sgst;
  return { subtotal, discountAmount, taxable, cgst, sgst, lineTotal };
}

export async function createBillAction(input: z.infer<typeof createBillSchema>) {
  const parsed = createBillSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid bill data" };

  const { shopId, userId, session } = await getShopContext();
  if (!session.shopVerified) {
    return { success: false, error: "Action blocked. Shop verification is pending." };
  }
  const db = getDb();

  // Enforce Subscription Limits
  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  // 1. Daily billing limit check
  const todayStr = new Date().toISOString().split("T")[0];
  const { count: todayBillsCount } = await db
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .gte("created_at", todayStr + "T00:00:00");

  if (todayBillsCount !== null && todayBillsCount >= limits.dailyBillingLimit) {
    return {
      success: false,
      error: `Daily billing limit of ${limits.dailyBillingLimit} bills reached. Please upgrade your subscription plan.`,
    };
  }

  // 2. Bill history FIFO overwrite check
  const { count: totalBills } = await db
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  if (totalBills !== null && totalBills >= limits.billHistoryLimit) {
    const toDelete = totalBills - limits.billHistoryLimit + 1;
    if (toDelete > 0) {
      const { data: oldestBills } = await db
        .from("bills")
        .select("id")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: true })
        .limit(toDelete);
      
      if (oldestBills && oldestBills.length > 0) {
        const ids = oldestBills.map((b) => b.id);
        await db.from("bills").delete().in("id", ids);
      }
    }
  }

  const { data: billNoData } = await db.rpc("generate_bill_no", { p_shop_id: shopId });
  const billNo = billNoData as string;

  let subtotal = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let totalAmount = 0;

  const lineItems: Array<Record<string, unknown>> = [];

  for (const item of parsed.data.items) {
    const { data: batch, error: batchErr } = await db
      .from("batches")
      .select("*, medicines(name, gst_rate)")
      .eq("id", item.batchId)
      .eq("shop_id", shopId)
      .single();

    if (batchErr || !batch) return { success: false, error: "Batch not found" };
    if (batch.quantity_remaining < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for ${(batch.medicines as { name: string }).name}. Available: ${batch.quantity_remaining}`,
      };
    }

    const med = batch.medicines as { name: string; gst_rate: number };
    const calc = calcLine(
      Number(batch.selling_price),
      item.quantity,
      item.discountPercent
    );

    subtotal += calc.subtotal;
    discountAmount += calc.discountAmount;
    taxableAmount += calc.taxable;
    cgstAmount += calc.cgst;
    sgstAmount += calc.sgst;
    totalAmount += calc.lineTotal;

    lineItems.push({
      shop_id: shopId,
      medicine_id: item.medicineId,
      batch_id: item.batchId,
      medicine_name: med.name,
      batch_no: batch.batch_no,
      expiry_date: batch.expiry_date,
      quantity: item.quantity,
      unit_price: batch.selling_price,
      discount_amount: calc.discountAmount,
      discount_percent: item.discountPercent,
      gst_rate: med.gst_rate,
      cgst_amount: calc.cgst,
      sgst_amount: calc.sgst,
      line_total: calc.lineTotal,
    });
  }

  const { data: bill, error: billError } = await db
    .from("bills")
    .insert({
      shop_id: shopId,
      bill_no: billNo,
      customer_name: parsed.data.customerName || null,
      customer_phone: parsed.data.customerPhone || null,
      doctor_name: parsed.data.doctorName || "Dr. S.K. Roy",
      subtotal,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      total_amount: totalAmount,
      payment_mode: parsed.data.paymentMode,
      created_by: userId,
    })
    .select()
    .single();

  if (billError || !bill) return { success: false, error: billError?.message ?? "Bill creation failed" };

  for (const line of lineItems) {
    const { error: itemErr } = await db.from("bill_items").insert({ ...line, bill_id: bill.id });
    if (itemErr) return { success: false, error: itemErr.message };

    const batchId = line.batch_id as string;
    const qty = line.quantity as number;
    const { data: current } = await db.from("batches").select("quantity_remaining").eq("id", batchId).single();
    if (current) {
      await db
        .from("batches")
        .update({ quantity_remaining: current.quantity_remaining - qty })
        .eq("id", batchId);
    }
  }

  revalidatePath("/billing");
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");

  return { success: true, billId: bill.id, billNo: bill.bill_no };
}

export async function getBillByIdAction(billId: string) {
  const { shopId, shopName } = await getShopContext();
  const db = getDb();

  const { data: bill } = await db
    .from("bills")
    .select("*")
    .eq("id", billId)
    .eq("shop_id", shopId)
    .single();

  if (!bill) return null;

  const { data: items } = await db
    .from("bill_items")
    .select("*")
    .eq("bill_id", billId)
    .order("created_at");

  return { bill, items: items ?? [], shopName };
}
