import { requireVerifiedShopSession } from "@/lib/auth/actions";
import { DealersClient } from "@/components/dealers/dealers-client";

export const metadata = { title: "Dealers" };
export const dynamic = "force-dynamic";

export default async function DealersPage() {
  const session = await requireVerifiedShopSession();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dealer Suppliers</h2>
        <p className="text-muted-foreground">Manage suppliers and track supplied vs expired value</p>
      </div>
      <DealersClient isVerified={session.shopVerified} />
    </div>
  );
}
