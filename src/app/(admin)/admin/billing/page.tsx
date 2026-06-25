import { getDb } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Subscription Billing" };
export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const db = getDb();
  const { data: payments } = await db
    .from("subscription_payments")
    .select("*, shops(name, city), subscription_plans(name, price)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subscription Billing</h2>
        <p className="text-muted-foreground">All shop subscription payments across the platform</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Shop</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Payment ID</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p) => {
                  const shop = p.shops as { name: string; city: string };
                  const plan = p.subscription_plans as { name: string; price: number };
                  return (
                    <tr key={p.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{shop?.name}<br /><span className="text-xs text-muted-foreground">{shop?.city}</span></td>
                      <td className="px-4 py-3">{plan?.name}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(p.amount))}</td>
                      <td className="px-4 py-3"><Badge variant={p.status === "completed" ? "success" : "warning"}>{p.status}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs">{p.razorpay_payment_id ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(p.paid_at ?? p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!payments?.length && (
              <p className="py-12 text-center text-muted-foreground">No subscription payments yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
