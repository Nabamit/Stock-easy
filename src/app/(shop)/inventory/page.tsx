import { InventoryClient } from "@/components/inventory/inventory-client";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inventory Overview</h2>
        <p className="text-muted-foreground">Filter expiring soon, low stock, and dead stock</p>
      </div>
      <InventoryClient />
    </div>
  );
}
