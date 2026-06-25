"use server";

import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";

export async function getShopAnalyticsAction(daysFilter: 30 | 60 | 90 = 30) {
  const { shopId } = await getShopContext();
  const db = getDb();

  const since = new Date();
  since.setDate(since.getDate() - daysFilter);
  const sinceStr = since.toISOString();

  const [{ data: bills }, { data: batches }, { data: medicines }] = await Promise.all([
    db.from("bills").select("total_amount, created_at, is_return").eq("shop_id", shopId).gte("created_at", sinceStr),
    db.from("batches").select("*, medicines(name)").eq("shop_id", shopId).gt("quantity_remaining", 0),
    db.from("medicines").select("id, name, min_stock_level").eq("shop_id", shopId).eq("is_active", true),
  ]);

  const salesByDay: Record<string, number> = {};
  let totalSales = 0;
  let returnAmount = 0;

  for (const b of bills ?? []) {
    const day = b.created_at.split("T")[0];
    const amt = Number(b.total_amount);
    if (b.is_return) {
      returnAmount += Math.abs(amt);
    } else {
      totalSales += amt;
      salesByDay[day] = (salesByDay[day] ?? 0) + amt;
    }
  }

  const salesTrend = Object.entries(salesByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sales]) => ({ date: date.slice(5), sales }));

  const now = new Date();
  let expiryLossValue = 0;
  const expiryTrend: Record<string, number> = {};

  for (const batch of batches ?? []) {
    const days = Math.ceil((new Date(batch.expiry_date).getTime() - now.getTime()) / 86400000);
    if (days <= daysFilter && days >= 0) {
      const val = Number(batch.cost_price) * batch.quantity_remaining;
      expiryTrend[batch.expiry_date.slice(0, 7)] = (expiryTrend[batch.expiry_date.slice(0, 7)] ?? 0) + val;
    }
    if (days < 0) {
      expiryLossValue += Number(batch.cost_price) * batch.quantity_remaining;
    }
  }

  const expiryChart = Object.entries(expiryTrend).map(([month, value]) => ({ month, value }));

  const medStock: Record<string, { total: number; name: string; min: number }> = {};
  for (const m of medicines ?? []) {
    medStock[m.id] = { total: 0, name: m.name, min: m.min_stock_level };
  }
  for (const b of batches ?? []) {
    if (medStock[b.medicine_id]) medStock[b.medicine_id].total += b.quantity_remaining;
  }

  const topStock = Object.values(medStock)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((m) => ({ name: m.name, qty: m.total }));

  const expiringSoon = (batches ?? [])
    .filter((b) => {
      const days = Math.ceil((new Date(b.expiry_date).getTime() - now.getTime()) / 86400000);
      return days <= EXPIRY_WARNING_DAYS && days >= 0;
    })
    .map((b) => ({
      name: (b.medicines as { name: string })?.name ?? "",
      expiry: b.expiry_date,
      qty: b.quantity_remaining,
    }))
    .slice(0, 10);

  return {
    totalSales,
    returnAmount,
    expiryLossValue,
    salesTrend,
    expiryChart,
    topStock,
    expiringSoon,
    daysFilter,
  };
}

export async function getPlatformAnalyticsAction() {
  const db = getDb();

  const [{ data: shops }, { data: bills }, { data: batches }] = await Promise.all([
    db.from("shops").select("id, name, city, state, verification_status, subscription_status, created_at"),
    db.from("bills").select("shop_id, total_amount, created_at, is_return"),
    db.from("batches").select("shop_id, quantity_remaining, cost_price, expiry_date"),
  ]);

  const statusCounts = { approved: 0, pending: 0, rejected: 0 };
  const stateCounts: Record<string, number> = {};
  for (const s of shops ?? []) {
    statusCounts[s.verification_status as keyof typeof statusCounts]++;
    if (s.state) stateCounts[s.state] = (stateCounts[s.state] ?? 0) + 1;
  }

  const shopSales: Record<string, number> = {};
  for (const b of bills ?? []) {
    if (!b.is_return) {
      shopSales[b.shop_id] = (shopSales[b.shop_id] ?? 0) + Number(b.total_amount);
    }
  }

  const topShops = (shops ?? [])
    .map((s) => ({ name: s.name, sales: shopSales[s.id] ?? 0, city: s.city }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const now = new Date();
  let platformExpiryLoss = 0;
  for (const b of batches ?? []) {
    if (new Date(b.expiry_date) < now) {
      platformExpiryLoss += Number(b.cost_price) * b.quantity_remaining;
    }
  }

  const shopsByState = Object.entries(stateCounts).map(([state, count]) => ({ state, count }));

  return {
    totalShops: shops?.length ?? 0,
    statusCounts,
    topShops,
    platformExpiryLoss,
    shopsByState,
    activeShops: statusCounts.approved,
  };
}
