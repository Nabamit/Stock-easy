"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getPlatformAnalyticsAction } from "@/lib/actions/analytics";
import { useEffect, useState, useTransition } from "react";
import { Store, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function PlatformAnalyticsClient() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getPlatformAnalyticsAction>> | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => setData(await getPlatformAnalyticsAction()));
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading platform analytics...</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Shops" value={data.totalShops} icon={Store} />
        <KpiCard title="Active" value={data.activeShops} icon={CheckCircle} iconClassName="bg-emerald-100 text-emerald-600" />
        <KpiCard title="Pending" value={data.statusCounts.pending} icon={Clock} iconClassName="bg-amber-100 text-amber-600" />
        <KpiCard title="Platform Expiry Loss" value={formatCurrency(data.platformExpiryLoss)} icon={AlertTriangle} iconClassName="bg-red-100 text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Shops by State</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.shopsByState}>
                  <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Most Active Shops</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.topShops.map((s) => (
                // FIXED: Changed key from s.name to a unique combination of name and city
                <li key={`${s.name}-${s.city}`} className="flex justify-between border-b pb-2">
                  <span>{s.name} <span className="text-muted-foreground">({s.city})</span></span>
                  <span className="font-medium">{formatCurrency(s.sales)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}