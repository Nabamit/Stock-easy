import { getDb } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/actions";
import { ShopsListClient } from "@/components/admin/shops-list-client";

export const metadata = { title: "Registered Pharmacies" };
export const dynamic = "force-dynamic";

export default async function AdminShopsPage() {
  const session = await requireAdminSession();
  const db = getDb();

  // Check if current user is Super Admin
  const { data: user } = await db
    .from("users")
    .select("is_super")
    .eq("id", session.userId)
    .single();
  const isSuper = user?.is_super ?? false;

  // Retrieve active subscription plans
  const { data: plans } = await db
    .from("subscription_plans")
    .select("id, name, price")
    .eq("is_active", true)
    .order("price");

  // Fetch shops with is_active and subscription_plan_id
  const { data: shops } = await db
    .from("shops")
    .select("id, name, owner_name, city, state, phone, verification_status, subscription_status, subscription_plan_id, subscription_plans(name, price), is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registered Pharmacies</h2>
        <p className="text-muted-foreground text-sm">
          Platform-wide pharmacy directory, location tracking, and subscription billing statuses.
        </p>
      </div>

      <ShopsListClient
        shops={shops ?? []}
        plans={plans ?? []}
        isSuper={isSuper}
      />
    </div>
  );
}
