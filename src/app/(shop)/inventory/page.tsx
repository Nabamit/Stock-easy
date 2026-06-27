import { requireVerifiedShopSession } from "@/lib/auth/actions";
import { InventoryClient } from "@/components/inventory/inventory-client";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await requireVerifiedShopSession();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inventory Overview</h2>
        <p className="text-muted-foreground">Filter expiring soon, low stock, and dead stock</p>
      </div>
      <InventoryClient isVerified={session.shopVerified} />
    </div>
  );
}
