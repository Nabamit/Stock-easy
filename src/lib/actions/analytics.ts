"use server";

import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";

export async function getShopAnalyticsAction(daysFilter: 7 | 30 | 60 | 90 = 30) {
  const { shopId, session } = await getShopContext();
  const db = getDb();

  // Enforce Subscription Limits
  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  const since = new Date();
  since.setDate(since.getDate() - daysFilter);
  const sinceStr = since.toISOString();

  // Fetch bills with nested items and batch cost prices
  const [
    { data: billsWithItems },
    { data: batches },
    { data: medicines },
    { count: totalDealers },
    { count: totalStaff }
  ] = await Promise.all([
    db
      .from("bills")
      .select(`
        id, 
        total_amount, 
        cgst_amount, 
        sgst_amount, 
        created_at, 
        is_return,
        bill_items (
          quantity, 
          line_total, 
          cgst_amount, 
          sgst_amount, 
          medicine_name,
          batches (
            cost_price, 
            dealer_id
          )
        )
      `)
      .eq("shop_id", shopId)
      .gte("created_at", sinceStr),
    db.from("batches").select("*, medicines(name)").eq("shop_id", shopId).gt("quantity_remaining", 0),
    db.from("medicines").select("id, name, min_stock_level").eq("shop_id", shopId).eq("is_active", true),
    db.from("dealers").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("is_active", true),
    db.from("users").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("role", "shop_staff")
  ]);

  const salesByDay: Record<string, number> = {};
  let totalSales = 0;
  let returnAmount = 0;
  let totalProfit = 0;

  // Track medicine sales for Top 5
  const medSales: Record<string, { name: string; qty: number; revenue: number }> = {};

  // Track dealers vs sales trend
  const dailyDealersAndSales: Record<string, { date: string; medicinesSold: number; dealersCount: number }> = {};
  const tempDate = new Date(since);
  const today = new Date();
  while (tempDate <= today) {
    const dStr = tempDate.toISOString().split("T")[0];
    dailyDealersAndSales[dStr] = { date: dStr.slice(5), medicinesSold: 0, dealersCount: 0 };
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Hourly time-of-day sales
  const hourlySales: Record<number, { hour: string; sales: number; count: number }> = {};
  for (let h = 0; h < 24; h++) {
    const label = `${h.toString().padStart(2, "0")}:00`;
    hourlySales[h] = { hour: label, sales: 0, count: 0 };
  }

  for (const b of billsWithItems ?? []) {
    const day = b.created_at.split("T")[0];
    const totalAmt = Number(b.total_amount || 0);
    const isRet = b.is_return;

    // Time of day sales
    const hour = new Date(b.created_at).getHours();
    if (!isRet) {
      hourlySales[hour].sales += totalAmt;
      hourlySales[hour].count += 1;
    }

    if (isRet) {
      returnAmount += Math.abs(totalAmt);
    } else {
      totalSales += totalAmt;
      if (salesByDay[day] !== undefined) {
        salesByDay[day] = (salesByDay[day] ?? 0) + totalAmt;
      } else {
        salesByDay[day] = totalAmt;
      }
    }

    const items = b.bill_items || [];
    const uniqueDealersToday = new Set<string>();

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const lineTotal = Number(item.line_total || 0);
      const cgst = Number(item.cgst_amount || 0);
      const sgst = Number(item.sgst_amount || 0);
      const medName = (item as any).medicine_name;
      
      const cost = Number((item.batches as any)?.cost_price || 0);
      const dealerId = (item.batches as any)?.dealer_id;

      const netRev = lineTotal - cgst - sgst;
      const profit = netRev - (cost * qty);

      if (isRet) {
        totalProfit -= profit;
      } else {
        totalProfit += profit;

        // Top Medicines sold
        if (!medSales[medName]) {
          medSales[medName] = { name: medName, qty: 0, revenue: 0 };
        }
        medSales[medName].qty += qty;
        medSales[medName].revenue += lineTotal;

        // Dealers vs sales trend
        if (dailyDealersAndSales[day]) {
          dailyDealersAndSales[day].medicinesSold += qty;
          if (dealerId) uniqueDealersToday.add(dealerId);
        }
      }
    }

    if (dailyDealersAndSales[day]) {
      dailyDealersAndSales[day].dealersCount = Math.max(
        dailyDealersAndSales[day].dealersCount,
        uniqueDealersToday.size
      );
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

  // Top 5 Best Selling Medicines
  const topBestSellers = Object.values(medSales)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Dealers vs Sales combo trend
  const dealersVsSalesTrend = Object.values(dailyDealersAndSales)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Time of day sales hourly list
  const hourlySalesData = Object.values(hourlySales);

  return {
    totalSales,
    returnAmount,
    expiryLossValue,
    totalProfit,
    totalDealers: totalDealers ?? 0,
    totalStaff: totalStaff ?? 0,
    salesTrend,
    expiryChart,
    topStock,
    expiringSoon,
    topBestSellers,
    dealersVsSalesTrend,
    hourlySalesData,
    daysFilter,
    limits,
    shopVerified: session.shopVerified,
  };
}

export async function getPlatformAnalyticsAction() {
  const db = getDb();

  const [{ data: shops }, { data: bills }, { data: batches }, { data: medicines }, { data: dealers }] = await Promise.all([
    db.from("shops").select("id, name, city, state, verification_status, subscription_status, auto_renew, is_active, created_at"),
    db.from("bills").select("shop_id, total_amount, created_at, is_return"),
    db.from("batches").select("shop_id, quantity_remaining, cost_price, expiry_date"),
    db.from("medicines").select("shop_id"),
    db.from("dealers").select("shop_id"),
  ]);

  const statusCounts = { approved: 0, pending: 0, rejected: 0 };
  const stateCounts: Record<string, number> = {};
  let autoRenewCount = 0;
  let deactivatedCount = 0;

  for (const s of shops ?? []) {
    statusCounts[s.verification_status as keyof typeof statusCounts]++;
    if (s.state) stateCounts[s.state] = (stateCounts[s.state] ?? 0) + 1;
    if (s.auto_renew) autoRenewCount++;
    if (!s.is_active) deactivatedCount++;
  }

  const shopSales: Record<string, number> = {};
  const shopBillCounts: Record<string, number> = {};
  for (const b of bills ?? []) {
    if (!b.is_return) {
      shopSales[b.shop_id] = (shopSales[b.shop_id] ?? 0) + Number(b.total_amount);
      shopBillCounts[b.shop_id] = (shopBillCounts[b.shop_id] ?? 0) + 1;
    }
  }

  const topShops = (shops ?? [])
    .map((s) => ({ id: s.id, name: s.name, sales: shopSales[s.id] ?? 0, city: s.city }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const now = new Date();
  let platformExpiryLoss = 0;
  let subscribedExpiryLoss = 0;
  let unsubscribedExpiryLoss = 0;

  const shopMap: Record<string, { subscription_status: string; is_active: boolean }> = {};
  for (const s of shops ?? []) {
    shopMap[s.id] = { subscription_status: s.subscription_status, is_active: s.is_active };
  }

  for (const b of batches ?? []) {
    if (new Date(b.expiry_date) < now) {
      const val = Number(b.cost_price) * b.quantity_remaining;
      platformExpiryLoss += val;

      const sh = shopMap[b.shop_id];
      const isSubscribed = sh && (sh.subscription_status === "active" || sh.subscription_status === "trial") && sh.is_active;
      if (isSubscribed) {
        subscribedExpiryLoss += val;
      } else {
        unsubscribedExpiryLoss += val;
      }
    }
  }

  const shopsByState = Object.entries(stateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  // Shop-wise total medicines and total dealers
  const shopMedCounts: Record<string, number> = {};
  for (const m of medicines ?? []) {
    if (m.shop_id) shopMedCounts[m.shop_id] = (shopMedCounts[m.shop_id] ?? 0) + 1;
  }

  const shopDealerCounts: Record<string, number> = {};
  for (const d of dealers ?? []) {
    if (d.shop_id) shopDealerCounts[d.shop_id] = (shopDealerCounts[d.shop_id] ?? 0) + 1;
  }

  const shopWiseStats = (shops ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    totalMedicines: shopMedCounts[s.id] ?? 0,
    totalDealers: shopDealerCounts[s.id] ?? 0,
    totalBills: shopBillCounts[s.id] ?? 0,
    totalSales: shopSales[s.id] ?? 0,
    city: s.city,
    state: s.state,
    isActive: s.is_active,
    subscriptionStatus: s.subscription_status,
  })).sort((a, b) => b.totalSales - a.totalSales);

  // Hourly transaction load
  const hourlyCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourlyCounts[h] = 0;
  for (const b of bills ?? []) {
    if (b.created_at && !b.is_return) {
      const hour = new Date(b.created_at).getHours();
      hourlyCounts[hour] = (hourlyCounts[hour] ?? 0) + 1;
    }
  }

  const hourlyLoad = Array.from({ length: 24 }, (_, h) => {
    const label = `${h.toString().padStart(2, "0")}:00`;
    return {
      hour: label,
      transactions: hourlyCounts[h] ?? 0,
    };
  });

  // Simulated Database Memory Load (correlates with transaction load + base system + backup cycles)
  const dbMemoryLoad = Array.from({ length: 24 }, (_, h) => {
    const label = `${h.toString().padStart(2, "0")}:00`;
    const tx = hourlyCounts[h] ?? 0;
    const baseMemory = 256;
    const peakMem = tx * 15;
    const nightlyBackup = (h >= 2 && h <= 4) ? 150 : 20;
    const cyclicBuffer = (h % 3) * 10;
    const finalMemoryMB = baseMemory + peakMem + nightlyBackup + cyclicBuffer;

    return {
      hour: label,
      memoryMB: finalMemoryMB,
      cpuPercent: Math.min(100, Math.round(8 + tx * 3.8 + (h >= 2 && h <= 4 ? 30 : 0) + (h % 2) * 5)),
    };
  });

  return {
    totalShops: shops?.length ?? 0,
    statusCounts,
    topShops,
    platformExpiryLoss,
    subscribedExpiryLoss,
    unsubscribedExpiryLoss,
    shopsByState,
    autoRenewCount,
    deactivatedCount,
    activeShops: statusCounts.approved,
    shopWiseStats,
    hourlyLoad,
    dbMemoryLoad,
  };
}
