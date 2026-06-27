"use server";

import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";
import type { BillPrintData } from "@/types/bill-print";

export async function getBillPrintDataAction(billId: string): Promise<BillPrintData | null> {
  const { shopId } = await getShopContext();
  const db = getDb();

  const { data: bill } = await db
    .from("bills")
    .select("*")
    .eq("id", billId)
    .eq("shop_id", shopId)
    .single();

  if (!bill) return null;

  const [{ data: items }, { data: shop }, { data: cashier }] = await Promise.all([
    db.from("bill_items").select("*").eq("bill_id", billId).order("created_at"),
    db.from("shops").select("name, address, city, gst_no, phone").eq("id", shopId).single(),
    bill.created_by
      ? db.from("users").select("name").eq("id", bill.created_by).single()
      : Promise.resolve({ data: null }),
  ]);

  const address = [shop?.address, shop?.city].filter(Boolean).join(", ");

  return {
    bill,
    items: items ?? [],
    shopName: shop?.name ?? "Pharmacy",
    shopAddress: address,
    shopPhone: shop?.phone ?? "",
    shopGstin: shop?.gst_no ?? "",
    cashierName: cashier?.name ?? "Staff",
  };
}
