import Link from "next/link";
import {
  Pill,
  Package,
  AlertTriangle,
  Clock,
  IndianRupee,
  Plus,
  Warehouse,
  Skull,
} from "lucide-react";
import { requireVerifiedShopSession } from "@/lib/auth/actions";
import { getShopDashboardData } from "@/lib/data/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { ExpiryChart } from "@/components/dashboard/expiry-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function ShopDashboardPage() {
  const session = await requireVerifiedShopSession();
  const { kpis, salesTrend, expiryDistribution, recentBills } =
    await getShopDashboardData(session.shopId!);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Welcome, {session.name}</h2>
          <p className="text-muted-foreground">{session.shopName}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/billing">
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Bill</Button>
          </Link>
          <Link href="/stock">
            <Button variant="outline" className="gap-2"><Package className="h-4 w-4" /> Add Stock</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Total Stock" value={kpis.totalStock} subtitle="units" icon={Warehouse} />
        <KpiCard title="Stock Value" value={formatCurrency(kpis.stockValue)} icon={IndianRupee} iconClassName="bg-blue-100 text-blue-600" />
        <KpiCard title="Near Expiry" value={kpis.expiringSoonCount} subtitle="≤90 days" icon={Clock} iconClassName="bg-amber-100 text-amber-600" />
        <KpiCard title="Low Stock" value={kpis.lowStockCount} icon={AlertTriangle} iconClassName="bg-orange-100 text-orange-600" />
        <KpiCard title="Dead Stock" value={kpis.deadStockCount} icon={Skull} iconClassName="bg-red-100 text-red-600" />
        <KpiCard title="Medicines" value={kpis.totalMedicines} icon={Pill} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesChart data={salesTrend.length > 0 ? salesTrend : [{ date: "N/A", sales: 0 }]} title="7-Day Sales" />
        <ExpiryChart data={expiryDistribution} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Bills</CardTitle>
          <Link href="/bills"><Button variant="ghost" size="sm">View all</Button></Link>
        </CardHeader>
        <CardContent>
          {recentBills.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No bills yet.</p>
          ) : (
            <div className="space-y-3">
              {recentBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{bill.bill_no}</p>
                    <p className="text-xs text-muted-foreground">{bill.customer_name ?? "Walk-in"} · {formatDate(bill.created_at)}</p>
                  </div>
                  <p className="font-semibold text-primary">{formatCurrency(Number(bill.total_amount))}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
