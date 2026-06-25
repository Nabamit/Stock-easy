import { getDb } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "All Shops" };
export const dynamic = "force-dynamic";

export default async function AdminShopsPage() {
  const db = getDb();
  const { data: shops } = await db
    .from("shops")
    .select("id, name, owner_name, city, state, phone, verification_status, subscription_status, subscription_plans(name, price), created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">All Shops</h2>
        <p className="text-muted-foreground">
          {shops?.length ?? 0} registered pharmacies on the platform
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Shop</th>
                  <th className="px-4 py-3 text-left font-medium">Owner</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-left font-medium">Verification</th>
                  <th className="px-4 py-3 text-left font-medium">Subscription</th>
                  <th className="px-4 py-3 text-left font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {(shops ?? []).map((shop) => {
                  const plan = shop.subscription_plans as unknown as { name: string; price: number } | null;
                  return (
                  <tr key={shop.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{shop.name}</td>
                    <td className="px-4 py-3">{shop.owner_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {shop.city}, {shop.state}
                    </td>
                    <td className="px-4 py-3">{plan?.name ?? "—"}</td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 capitalize">{shop.subscription_status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(shop.created_at)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
