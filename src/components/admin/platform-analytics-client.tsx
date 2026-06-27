"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getPlatformAnalyticsAction } from "@/lib/actions/analytics";
import { useEffect, useState, useTransition } from "react";
import {
  Store,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  UserX,
  Zap,
  Database,
  TrendingUp,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function PlatformAnalyticsClient() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getPlatformAnalyticsAction>> | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => setData(await getPlatformAnalyticsAction()));
  }, []);

  if (!data) return <p className="text-muted-foreground p-6">Loading platform analytics dashboards...</p>;

  return (
    <div className="space-y-6">
      {/* 6-Card KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          title="Total Shops"
          value={data.totalShops}
          icon={Store}
          iconClassName="bg-blue-500/10 text-blue-500"
        />
        <KpiCard title="Active Accounts" value={data.activeShops} icon={CheckCircle} iconClassName="bg-emerald-500/10 text-emerald-500" />
        <KpiCard title="Pending Queue" value={data.statusCounts.pending} icon={Clock} iconClassName="bg-amber-500/10 text-amber-500" />
        <KpiCard
          title="Auto-Renewing"
          value={data.autoRenewCount}
          icon={RotateCcw}
          iconClassName="bg-indigo-500/10 text-indigo-500"
        />
        <KpiCard
          title="Deactivated"
          value={data.deactivatedCount}
          icon={UserX}
          iconClassName="bg-rose-500/10 text-rose-500"
        />
        <KpiCard
          title="Total Expiry Loss"
          value={formatCurrency(data.platformExpiryLoss)}
          icon={AlertTriangle}
          iconClassName="bg-red-500/10 text-red-500"
        />
      </div>

      {/* Subscribed vs Non-subscribed Expiry Loss Details */}
      <Card className="border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 text-xs">
            <div>
              <h4 className="font-bold text-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Platform Expiry Loss Breakdown
              </h4>
              <p className="text-muted-foreground mt-0.5">
                Breakdown of medicine expiry cost write-offs on the platform based on subscription levels.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-8">
              <div className="border-l pl-3">
                <span className="text-muted-foreground block font-medium">Subscribed Shop Loss:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(data.subscribedExpiryLoss ?? 0)}
                </span>
              </div>
              <div className="border-l pl-3">
                <span className="text-muted-foreground block font-medium">Non-Subscribed/Inactive Loss:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {formatCurrency(data.unsubscribedExpiryLoss ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Patterns Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Peak Software Usage Load (Hourly) */}
        <Card className="border">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Peak Software Usage Load (Hourly Transaction Frequency)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyLoad ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="transactions" fill="hsl(215, 80%, 55%)" radius={[4, 4, 0, 0]} name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Database Memory & CPU Load Line Chart */}
        <Card className="border">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <Database className="h-4 w-4 text-cyan-500" />
              Simulated Database Memory & CPU Load Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dbMemoryLoad ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="memoryMB" stroke="#06b6d4" name="Memory MB" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="cpuPercent" stroke="#f43f5e" name="CPU Usage %" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Usage Analysis & Shop-Wise Statistics */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Geographic State Ranking */}
        <Card className="border lg:col-span-1">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Geographic Usage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {data.shopsByState.map((item, idx) => (
                <div key={item.state} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-muted-foreground w-4">#{idx + 1}</span>
                    <span className="font-semibold text-xs">{item.state || "Unknown State"}</span>
                  </div>
                  <Badge variant={idx === 0 ? "default" : "secondary"}>
                    {item.count} shops
                  </Badge>
                </div>
              ))}
              {!data.shopsByState.length && (
                <p className="text-muted-foreground text-center py-6 text-xs">No geographic data available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Most Active Shops */}
        <Card className="border lg:col-span-2">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              Most Active Shops Sales Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-3 text-xs sm:text-sm">
              {data.topShops.map((s, idx) => (
                <li key={s.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                  <span>
                    <strong className="text-muted-foreground w-5 inline-block">#{idx + 1}</strong>
                    {s.name} <span className="text-muted-foreground text-xs">({s.city})</span>
                  </span>
                  <span className="font-semibold text-primary">{formatCurrency(s.sales)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Shop-wise Breakdown Table */}
      <Card className="border">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-base font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Shop-Wise Inventory, Dealers & Transaction Audits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Pharmacy Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-center">Total Medicines</th>
                  <th className="px-4 py-3 text-center">Total Dealers</th>
                  <th className="px-4 py-3 text-center">Total Bills (Tx)</th>
                  <th className="px-4 py-3 text-right">Cumulative Sales</th>
                  <th className="px-4 py-3 text-center">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.shopWiseStats ?? []).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-semibold text-foreground">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.city}, {s.state}</td>
                    <td className="px-4 py-3 text-center font-medium text-cyan-600 dark:text-cyan-400">{s.totalMedicines}</td>
                    <td className="px-4 py-3 text-center font-medium text-indigo-600 dark:text-indigo-400">{s.totalDealers}</td>
                    <td className="px-4 py-3 text-center font-medium text-emerald-600 dark:text-emerald-400">{s.totalBills}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(s.totalSales)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={s.isActive ? "success" : "secondary"}>
                        {s.isActive ? "Active" : "Deactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}