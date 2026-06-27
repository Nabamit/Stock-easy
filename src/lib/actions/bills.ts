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
      customer_phone: originalBill.customer_phone,
      doctor_name: originalBill.doctor_name,
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

export async function getSalesHistoryAction(search?: string) {
  const { shopId } = await getShopContext();
  const db = getDb();

  // 1. Fetch all users for name mapping
  const { data: users } = await db
    .from("users")
    .select("id, name")
    .eq("shop_id", shopId);

  const userMap: Record<string, string> = {};
  for (const u of users ?? []) {
    userMap[u.id] = u.name;
  }

  // 2. Query bill items with their parent bills
  const { data: items } = await db
    .from("bill_items")
    .select(`
      id,
      medicine_name,
      batch_no,
      quantity,
      line_total,
      created_at,
      bills (
        bill_no,
        customer_name,
        customer_phone,
        doctor_name,
        total_amount,
        is_return,
        created_by
      )
    `)
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(100);

  // 3. Map records, lookup cashier names, and filter by search query
  const mapped = (items ?? []).map((item) => {
    const parentBill = item.bills as any;
    const cashierName = parentBill?.created_by ? (userMap[parentBill.created_by] ?? "System") : "System";
    return {
      id: item.id,
      billNo: parentBill?.bill_no ?? "N/A",
      medicineName: item.medicine_name,
      batchNo: item.batch_no,
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
      totalBillAmount: Number(parentBill?.total_amount || 0),
      isReturn: parentBill?.is_return ?? false,
      cashierName,
      customerName: parentBill?.customer_name ?? "Walk-in",
      customerPhone: parentBill?.customer_phone ?? "N/A",
      doctorName: parentBill?.doctor_name ?? "Dr. S.K. Roy",
      createdAt: item.created_at,
    };
  });

  if (search?.trim()) {
    const searchLower = search.toLowerCase().trim();
    return mapped.filter((item) => 
      item.billNo.toLowerCase().includes(searchLower) ||
      item.medicineName.toLowerCase().includes(searchLower) ||
      item.batchNo.toLowerCase().includes(searchLower) ||
      item.customerName.toLowerCase().includes(searchLower) ||
      item.customerPhone.toLowerCase().includes(searchLower) ||
      item.cashierName.toLowerCase().includes(searchLower)
    );
  }

  return mapped;
}

export async function deleteSalesItemAction(itemId: string) {
  const { shopId, session } = await getShopContext();
  if (session.role !== "shop_owner") {
    return { success: false, error: "Only shop owners can delete sales history records." };
  }
  const db = getDb();

  // 1. Fetch the item details
  const { data: item, error: itemErr } = await db
    .from("bill_items")
    .select("*, bills(*)")
    .eq("id", itemId)
    .eq("shop_id", shopId)
    .single();

  if (itemErr || !item) {
    return { success: false, error: "Sales transaction item not found." };
  }

  // 2. Add quantity back to the batch
  const { data: batch } = await db
    .from("batches")
    .select("quantity_remaining")
    .eq("id", item.batch_id)
    .single();

  if (batch) {
    await db
      .from("batches")
      .update({ quantity_remaining: batch.quantity_remaining + item.quantity })
      .eq("id", item.batch_id);
  }

  // 3. Delete the bill item
  await db.from("bill_items").delete().eq("id", itemId);

  // 4. Update the parent bill's total amounts
  const parentBill = item.bills;
  const { data: remainingItems } = await db
    .from("bill_items")
    .select("*")
    .eq("bill_id", parentBill.id);

  if (!remainingItems || remainingItems.length === 0) {
    // No items left on this bill, delete the bill itself
    await db.from("bills").delete().eq("id", parentBill.id);
  } else {
    // Re-calculate bill totals
    let newSubtotal = 0;
    let newDiscount = 0;
    let newCgst = 0;
    let newSgst = 0;
    let newTotal = 0;

    for (const rem of remainingItems) {
      const itemSubtotal = Number(rem.unit_price) * rem.quantity;
      const itemDiscount = itemSubtotal * (Number(rem.discount_percent || 0) / 100);
      const itemTaxable = itemSubtotal - itemDiscount;
      const itemCgst = itemTaxable * (Number(rem.gst_rate || 5) / 200);
      const itemSgst = itemTaxable * (Number(rem.gst_rate || 5) / 200);
      
      newSubtotal += itemSubtotal;
      newDiscount += itemDiscount;
      newCgst += itemCgst;
      newSgst += itemSgst;
      newTotal += Number(rem.line_total);
    }

    await db
      .from("bills")
      .update({
        subtotal: newSubtotal,
        discount_amount: newDiscount,
        taxable_amount: newSubtotal - newDiscount,
        cgst_amount: newCgst,
        sgst_amount: newSgst,
        total_amount: newTotal,
      })
      .eq("id", parentBill.id);
  }

  revalidatePath("/sales");
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  return { success: true };
}

export async function updateSalesItemAction(
  itemId: string,
  updateData: { customerName: string; customerPhone: string; doctorName: string; quantity: number }
) {
  const { shopId, session } = await getShopContext();
  if (session.role !== "shop_owner") {
    return { success: false, error: "Only shop owners can edit sales history records." };
  }
  const db = getDb();

  // 1. Fetch item and parent bill
  const { data: item, error: itemErr } = await db
    .from("bill_items")
    .select("*, bills(*)")
    .eq("id", itemId)
    .eq("shop_id", shopId)
    .single();

  if (itemErr || !item) {
    return { success: false, error: "Sales transaction item not found." };
  }

  const parentBill = item.bills;

  // 2. Handle quantity change if different
  const diff = updateData.quantity - item.quantity;
  if (diff !== 0) {
    // Check batch stock availability
    const { data: batch } = await db
      .from("batches")
      .select("quantity_remaining")
      .eq("id", item.batch_id)
      .single();

    if (!batch) return { success: false, error: "Batch not found." };
    if (batch.quantity_remaining < diff) {
      return { success: false, error: `Insufficient stock in batch. Available: ${batch.quantity_remaining + item.quantity}` };
    }

    // Update batch quantity
    await db
      .from("batches")
      .update({ quantity_remaining: batch.quantity_remaining - diff })
      .eq("id", item.batch_id);

    // Recalculate item totals
    const itemSubtotal = Number(item.unit_price) * updateData.quantity;
    const itemDiscount = itemSubtotal * (Number(item.discount_percent || 0) / 100);
    const itemTaxable = itemSubtotal - itemDiscount;
    const itemCgst = itemTaxable * (Number(item.gst_rate || 5) / 200);
    const itemSgst = itemTaxable * (Number(item.gst_rate || 5) / 200);
    const newLineTotal = itemTaxable + itemCgst + itemSgst;

    // Update bill item
    await db
      .from("bill_items")
      .update({
        quantity: updateData.quantity,
        discount_amount: itemDiscount,
        cgst_amount: itemCgst,
        sgst_amount: itemSgst,
        line_total: newLineTotal,
      })
      .eq("id", itemId);
  }

  // 3. Update parent bill (Customer info, Doctor name, and recalculated totals if quantity changed)
  const { data: remainingItems } = await db
    .from("bill_items")
    .select("*")
    .eq("bill_id", parentBill.id);

  let newSubtotal = 0;
  let newDiscount = 0;
  let newCgst = 0;
  let newSgst = 0;
  let newTotal = 0;

  for (const rem of remainingItems ?? []) {
    const itemSubtotal = Number(rem.unit_price) * rem.quantity;
    const itemDiscount = itemSubtotal * (Number(rem.discount_percent || 0) / 100);
    const itemTaxable = itemSubtotal - itemDiscount;
    const itemCgst = itemTaxable * (Number(rem.gst_rate || 5) / 200);
    const itemSgst = itemTaxable * (Number(rem.gst_rate || 5) / 200);

    newSubtotal += itemSubtotal;
    newDiscount += itemDiscount;
    newCgst += itemCgst;
    newSgst += itemSgst;
    newTotal += Number(rem.line_total);
  }

  await db
    .from("bills")
    .update({
      customer_name: updateData.customerName || null,
      customer_phone: updateData.customerPhone || null,
      doctor_name: updateData.doctorName || "Dr. S.K. Roy",
      subtotal: newSubtotal,
      discount_amount: newDiscount,
      taxable_amount: newSubtotal - newDiscount,
      cgst_amount: newCgst,
      sgst_amount: newSgst,
      total_amount: newTotal,
    })
    .eq("id", parentBill.id);

  revalidatePath("/sales");
  revalidatePath("/bills");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  return { success: true };
}
