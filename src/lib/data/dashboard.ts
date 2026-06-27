import { getDb } from "@/lib/supabase/server";
import { EXPIRY_CRITICAL_DAYS, EXPIRY_WARNING_DAYS } from "@/lib/constants";
import type { DashboardKPIs } from "@/types";

export async function getShopDashboardData(shopId: string) {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const criticalDate = new Date();
  criticalDate.setDate(criticalDate.getDate() + EXPIRY_CRITICAL_DAYS);
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString();

  const [
    medicinesRes,
    batchesRes,
    batchDetailsRes,
    expiringRes,
    todaySalesRes,
    monthSalesRes,
    salesTrendRes,
    expiryDistRes,
    recentBillsRes,
  ] = await Promise.all([
    db.from("medicines").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("is_active", true),
    db.from("batches").select("id", { count: "exact", head: true }).eq("shop_id", shopId).gt("quantity_remaining", 0),
    db.from("batches").select("quantity_remaining, cost_price, expiry_date, updated_at").eq("shop_id", shopId).gt("quantity_remaining", 0),
    db.from("batches").select("id", { count: "exact", head: true }).eq("shop_id", shopId).gt("quantity_remaining", 0).lte("expiry_date", warningDate.toISOString().split("T")[0]),
    db.from("bills").select("total_amount").eq("shop_id", shopId).gte("created_at", today).eq("is_return", false),
    db.from("bills").select("total_amount").eq("shop_id", shopId).gte("created_at", monthStartStr).eq("is_return", false),
    db.from("bills").select("created_at, total_amount").eq("shop_id", shopId).gte("created_at", sevenDaysStr).eq("is_return", false).order("created_at"),
    db.from("batches").select("expiry_date, quantity_remaining").eq("shop_id", shopId).gt("quantity_remaining", 0),
    db.from("bills").select("id, bill_no, total_amount, created_at, customer_name").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(5),
  ]);

  let totalStock = 0;
  let stockValue = 0;
  let deadStockCount = 0;
  const now = new Date();

  for (const b of batchDetailsRes.data ?? []) {
    totalStock += b.quantity_remaining;
    stockValue += Number(b.cost_price) * b.quantity_remaining;
    const days = Math.ceil((new Date(b.expiry_date).getTime() - now.getTime()) / 86400000);
    if (days < 0) deadStockCount++;
  }

  const todaySales = (todaySalesRes.data ?? []).reduce((s, b) => s + Number(b.total_amount), 0);
  const monthSales = (monthSalesRes.data ?? []).reduce((s, b) => s + Number(b.total_amount), 0);

  // Low stock count: medicines where total batch qty < min_stock_level
  const [medRes, batchRes] = await Promise.all([
    db
      .from("medicines")
      .select("id, min_stock_level")
      .eq("shop_id", shopId)
      .eq("is_active", true),
    db
      .from("batches")
      .select("medicine_id, quantity_remaining")
      .eq("shop_id", shopId)
      .gt("quantity_remaining", 0)
  ]);
  const stockByMed: Record<string, { total: number; min: number }> = {};
  for (const m of medRes.data ?? []) {
    stockByMed[m.id] = { total: 0, min: m.min_stock_level ?? 10 };
  }
  for (const b of batchRes.data ?? []) {
    if (stockByMed[b.medicine_id]) {
      stockByMed[b.medicine_id].total += b.quantity_remaining;
    }
  }

  // A batch is low stock if its quantity is less than the medicine's min_stock_level.
  // Also count out-of-stock medicines.
  let lowStockCount = 0;
  for (const b of batchRes.data ?? []) {
    const min = stockByMed[b.medicine_id]?.min ?? 10;
    if (b.quantity_remaining < min) {
      lowStockCount++;
    }
  }
  for (const m of medRes.data ?? []) {
    const total = stockByMed[m.id]?.total ?? 0;
    const min = stockByMed[m.id]?.min ?? 10;
    if (total === 0 && total < min) {
      lowStockCount++;
    }
  }

  // Sales trend by day
  const salesByDay: Record<string, number> = {};
  for (const bill of salesTrendRes.data ?? []) {
    const day = bill.created_at.split("T")[0].slice(5);
    salesByDay[day] = (salesByDay[day] ?? 0) + Number(bill.total_amount);
  }
  const salesTrend = Object.entries(salesByDay).map(([date, sales]) => ({ date, sales }));

  // Expiry distribution
  const dist = { expired: 0, critical: 0, warning: 0, normal: 0 };
  for (const b of expiryDistRes.data ?? []) {
    const days = Math.ceil(
      (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) dist.expired++;
    else if (days <= EXPIRY_CRITICAL_DAYS) dist.critical++;
    else if (days <= EXPIRY_WARNING_DAYS) dist.warning++;
    else dist.normal++;
  }

  const expiryDistribution = [
    { range: "Expired", count: dist.expired, color: "#ef4444" },
    { range: "<30 days", count: dist.critical, color: "#f97316" },
    { range: "30-90 days", count: dist.warning, color: "#eab308" },
    { range: ">90 days", count: dist.normal, color: "#22c55e" },
  ];

  const kpis: DashboardKPIs = {
    totalMedicines: medicinesRes.count ?? 0,
    totalStock,
    stockValue,
    totalBatches: batchesRes.count ?? 0,
    lowStockCount,
    expiringSoonCount: expiringRes.count ?? 0,
    todaySales,
    monthSales,
    deadStockCount,
  };

  return { kpis, salesTrend, expiryDistribution, recentBills: recentBillsRes.data ?? [] };
}

export async function getAdminDashboardData() {
  const db = getDb();

  const [shopsRes, pendingRes, approvedRes, usersRes, billsRes, medicinesRes, allBillsRes] = await Promise.all([
    db.from("shops").select("id, name, verification_status, city, created_at, subscription_plans(name)").order("created_at", { ascending: false }),
    db.from("shops").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    db.from("shops").select("id", { count: "exact", head: true }).eq("verification_status", "approved"),
    db.from("users").select("id", { count: "exact", head: true }).neq("role", "central_admin"),
    db.from("bills").select("total_amount, created_at").gte("created_at", new Date(new Date().setDate(1)).toISOString()),
    db.from("medicines").select("id", { count: "exact", head: true }),
    db.from("bills").select("id", { count: "exact", head: true }),
  ]);

  const platformRevenue = (billsRes.data ?? []).reduce((s, b) => s + Number(b.total_amount), 0);

  const statusCounts = { pending: 0, approved: 0, rejected: 0 };
  const planCounts = { Starter: 0, Professional: 0, Enterprise: 0, Trial: 0 };

  for (const shop of shopsRes.data ?? []) {
    statusCounts[shop.verification_status as keyof typeof statusCounts]++;
    
    const planName = (shop.subscription_plans as any)?.name;
    if (planName === "Starter" || planName === "Small Pharmacies") {
      planCounts.Starter++;
    } else if (planName === "Professional") {
      planCounts.Professional++;
    } else if (planName === "Enterprise") {
      planCounts.Enterprise++;
    } else {
      planCounts.Trial++;
    }
  }

  return {
    totalShops: shopsRes.data?.length ?? 0,
    pendingCount: pendingRes.count ?? 0,
    approvedCount: approvedRes.count ?? 0,
    totalUsers: usersRes.count ?? 0,
    platformRevenue,
    shops: shopsRes.data ?? [],
    statusCounts,
    totalMedicines: medicinesRes.count ?? 0,
    totalBills: allBillsRes.count ?? 0,
    planDistribution: [
      { name: "Small Pharmacies (Starter)", count: planCounts.Starter },
      { name: "Professional", count: planCounts.Professional },
      { name: "Enterprise", count: planCounts.Enterprise },
      { name: "Trial / Unsubscribed", count: planCounts.Trial },
    ],
  };
}
