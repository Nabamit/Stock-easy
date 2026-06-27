import { requireVerifiedShopSession } from "@/lib/auth/actions";
import { SalesClient } from "@/components/sales/sales-client";

export const metadata = { title: "Sales History" };
export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const session = await requireVerifiedShopSession();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sales History</h2>
        <p className="text-muted-foreground">Itemized history of all sales transactions and returns</p>
      </div>
      <SalesClient userRole={session.role} />
    </div>
  );
}
