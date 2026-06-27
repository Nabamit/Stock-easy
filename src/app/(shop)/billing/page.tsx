import { requireVerifiedShopSession } from "@/lib/auth/actions";
import { BillingClient } from "@/components/billing/billing-client";

export const metadata = { title: "New Bill" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await requireVerifiedShopSession();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">FEFO Billing</h2>
        <p className="text-muted-foreground">Nearest expiry batches are highlighted automatically</p>
      </div>
      <BillingClient shopName={session.shopName ?? "Pharmacy"} isVerified={session.shopVerified} />
    </div>
  );
}
