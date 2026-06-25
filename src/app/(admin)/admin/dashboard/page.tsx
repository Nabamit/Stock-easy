import Link from "next/link";
import { Store, Users, Clock, CheckCircle, IndianRupee } from "lucide-react";
import { getAdminDashboardData } from "@/lib/data/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Dashboard</h2>
          <p className="text-muted-foreground">Stock Easy central administration</p>
        </div>
        {data.pendingCount > 0 && (
          <Link href="/admin/verification">
            <Button variant="destructive" className="gap-2">
              <Clock className="h-4 w-4" />
              {data.pendingCount} Pending Verification
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Shops" value={data.totalShops} icon={Store} />
        <KpiCard
          title="Approved"
          value={data.approvedCount}
          icon={CheckCircle}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          title="Pending"
          value={data.pendingCount}
          icon={Clock}
          iconClassName="bg-amber-100 text-amber-600"
        />
        <KpiCard title="Shop Users" value={data.totalUsers} icon={Users} />
      </div>

      <KpiCard
        title="Platform Revenue (This Month)"
        value={formatCurrency(data.platformRevenue)}
        icon={IndianRupee}
        iconClassName="bg-blue-100 text-blue-600"
        className="max-w-sm"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Shops</CardTitle>
          <Link href="/admin/shops">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.shops.slice(0, 8).map((shop) => (
              <div
                key={shop.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{shop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {shop.city ?? "—"} · {formatDate(shop.created_at)}
                  </p>
                </div>
                <Badge
                  variant={
                    shop.verification_status === "approved"
                      ? "success"
                      : shop.verification_status === "pending"
                        ? "warning"
                        : "danger"
                  }
                >
                  {shop.verification_status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
