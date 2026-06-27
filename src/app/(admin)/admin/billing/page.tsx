import { getDb } from "@/lib/supabase/server";
import { BillingListClient } from "@/components/admin/billing-list-client";

export const metadata = { title: "Subscription Billing" };
export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const db = getDb();
  const { data: payments } = await db
    .from("subscription_payments")
    .select("*, shops(name, city, state), subscription_plans(name, price)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subscription Billing</h2>
        <p className="text-muted-foreground">All shop subscription payments across the platform</p>
      </div>

      <BillingListClient payments={payments ?? []} />
    </div>
  );
}
