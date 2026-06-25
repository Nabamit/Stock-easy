"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { getShopAnalyticsAction } from "@/lib/actions/analytics";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertTriangle, Package } from "lucide-react";

export function AnalyticsClient() {
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [data, setData] = useState<Awaited<ReturnType<typeof getShopAnalyticsAction>> | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => setData(await getShopAnalyticsAction(days)));
  }, [days]);

  if (!data) return <p className="text-muted-foreground">Loading analytics...</p>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {([30, 60, 90] as const).map((d) => (
          <Button key={d} variant={days === d ? "default" : "outline"} size="sm" onClick={() => setDays(d)} disabled={isPending}>
            Last {d} days
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Total Sales" value={formatCurrency(data.totalSales)} icon={TrendingUp} />
        <KpiCard title="Returns" value={formatCurrency(data.returnAmount)} icon={Package} iconClassName="bg-orange-100 text-orange-600" />
        <KpiCard title="Expiry Loss Value" value={formatCurrency(data.expiryLossValue)} icon={AlertTriangle} iconClassName="bg-red-100 text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart data={data.salesTrend.length ? data.salesTrend : [{ date: "N/A", sales: 0 }]} title="Sales Trend" />
        <Card>
          <CardHeader><CardTitle className="text-base">Expiry Risk by Month</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.expiryChart}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Stock by Quantity</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.topStock.map((m) => (
                <li key={m.name} className="flex justify-between border-b pb-2">
                  <span>{m.name}</span><span className="font-medium">{m.qty} units</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Expiring Soon</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.expiringSoon.map((m, i) => (
                <li key={i} className="flex justify-between border-b pb-2">
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">{m.qty} · {m.expiry}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
