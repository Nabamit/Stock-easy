"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getShopAnalyticsAction } from "@/lib/actions/analytics";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  Users,
  Lock,
  ArrowUpRight,
  Clock,
  Award,
  Truck,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

export function AnalyticsClient() {
  const [days, setDays] = useState<7 | 30 | 60 | 90>(30);
  const [data, setData] = useState<Awaited<ReturnType<typeof getShopAnalyticsAction>> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const res = await getShopAnalyticsAction(days);
      setData(res);
    });
  }, [days]);

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading interactive analytics...</p>
        </div>
      </div>
    );
  }

  const limits = data.limits;
  const isUnlocked = limits?.analyticsUnlocked;

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            Monitor sales performance, expiry risks, and distributor metrics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 bg-muted/50 p-1.5 rounded-xl border w-fit">
          {([7, 30, 60, 90] as const).map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-xs"
              onClick={() => setDays(d)}
              disabled={isPending}
            >
              Last {d} days
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          title="Total Sales"
          value={formatCurrency(data.totalSales)}
          icon={TrendingUp}
          iconClassName="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400"
        />
        <KpiCard
          title="Net Profit"
          value={formatCurrency(data.totalProfit)}
          icon={DollarSign}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
        />
        <KpiCard
          title="Returns"
          value={formatCurrency(data.returnAmount)}
          icon={Package}
          iconClassName="bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400"
        />
        <KpiCard
          title="Expiry Loss Value"
          value={formatCurrency(data.expiryLossValue)}
          icon={AlertTriangle}
          iconClassName="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
        />
        <KpiCard
          title="Total Dealers"
          value={data.totalDealers}
          icon={Truck}
          iconClassName="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
        />
        <KpiCard
          title="Number of Staff"
          value={data.totalStaff}
          icon={UserCheck}
          iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400"
        />
      </div>

      {/* Charts Section with conditional blur / lock overlay */}
      <div className="relative">
        {(!isUnlocked || !data.shopVerified) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-background/40 backdrop-blur-md rounded-2xl border border-dashed border-muted-foreground/30">
            <Card className="max-w-md w-full text-center p-6 shadow-2xl border border-primary/20 bg-card/95 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold mb-2">
                {!data.shopVerified ? "Verification Pending" : "Unlock Advanced Analytics"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mb-6">
                {!data.shopVerified
                  ? "Analytics and charts are locked. Once your shop is verified and approved by our central team, advanced insights will be fully unlocked."
                  : "Your current Starter tier has access to basic KPIs only. Upgrade to a Professional or Enterprise plan to unlock trend forecasting, hourly sales mapping, supplier interactions, and best-seller comparisons."}
              </p>
              <div className="flex flex-col gap-2">
                {data.shopVerified ? (
                  <>
                    <Button asChild className="w-full shadow-lg shadow-primary/25">
                      <Link href="/settings" className="flex items-center justify-center gap-1.5">
                        Upgrade Subscription Tier
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" asChild>
                      <Link href="/settings">View Plan Comparison</Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/50">
                    Verification usually takes 24–48 hours. Please ensure your documents are valid.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <div className={(!isUnlocked || !data.shopVerified) ? "blur-sm pointer-events-none select-none space-y-6" : "space-y-6"}>
          {/* Row 1: Sales Trend & Expiry Risk */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden border">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-cyan-500" />
                  Sales Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.salesTrend.length ? data.salesTrend : [{ date: "N/A", sales: 0 }]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} className="text-muted-foreground" />
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value ?? 0)), "Sales"]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Area type="monotone" dataKey="sales" stroke="hsl(199, 89%, 48%)" fill="url(#salesGradient)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Expiry Risk by Month
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.expiryChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(v) => [formatCurrency(Number(v)), "Risk Value"]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(346, 84%, 55%)" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Best Sellers & Supplier Combo Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden border">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Top Best-Selling Medicines
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={data.topBestSellers.length ? data.topBestSellers : [{ name: "None", qty: 0, revenue: 0 }]}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="qty" name="Quantity Sold" fill="hsl(262, 83%, 62%)" radius={[0, 4, 4, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Dealers Visited vs Medicines Sold
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.dealersVsSalesTrend} margin={{ top: 5, right: -10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" orientation="left" label={{ value: 'Qty Sold', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'Dealers Active', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      <Bar yAxisId="left" dataKey="medicinesSold" name="Medicines Sold (Qty)" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} opacity={0.8} />
                      <Line yAxisId="right" type="monotone" dataKey="dealersCount" name="Active Suppliers" stroke="hsl(262, 83%, 62%)" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Hourly Time-of-Day Sales & Existing Lists */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="overflow-hidden border lg:col-span-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-500" />
                  Hourly Time-of-Day Sales
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.hourlySalesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(262, 83%, 62%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(262, 83%, 62%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        formatter={(v) => [formatCurrency(Number(v)), "Sales"]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Area type="monotone" dataKey="sales" name="Hourly Sales" stroke="hsl(262, 83%, 62%)" fill="url(#hourlyGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border">
                <CardHeader className="bg-muted/30 py-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Top Stock by Quantity
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[12.5rem] overflow-y-auto">
                  <ul className="space-y-2 text-xs">
                    {data.topStock.map((m) => (
                      <li key={m.name} className="flex justify-between border-b pb-2 last:border-b-0 last:pb-0">
                        <span className="font-medium text-foreground truncate max-w-[12rem]">{m.name}</span>
                        <span className="text-muted-foreground">{m.qty} units</span>
                      </li>
                    ))}
                    {!data.topStock.length && (
                      <p className="text-muted-foreground text-center py-4">No stock recorded.</p>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader className="bg-muted/30 py-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    Expiring Soon (Batch Alert)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[12.5rem] overflow-y-auto">
                  <ul className="space-y-2 text-xs">
                    {data.expiringSoon.map((m, i) => (
                      <li key={i} className="flex justify-between border-b pb-2 last:border-b-0 last:pb-0">
                        <span className="font-medium text-foreground truncate max-w-[10rem]">{m.name}</span>
                        <span className="text-rose-600 font-medium">{m.qty} u · {m.expiry}</span>
                      </li>
                    ))}
                    {!data.expiringSoon.length && (
                      <p className="text-emerald-600 text-center py-4 font-medium">All batches are safe from immediate expiry.</p>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

