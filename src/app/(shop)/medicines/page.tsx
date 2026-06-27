import { requireVerifiedShopSession } from "@/lib/auth/actions";
import { MedicinesClient } from "@/components/medicines/medicines-client";

export const metadata = { title: "Medicines" };
export const dynamic = "force-dynamic";

export default async function MedicinesPage() {
  const session = await requireVerifiedShopSession();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Medicine Catalogue</h2>
        <p className="text-muted-foreground">Search, view stock levels, and add new medicines</p>
      </div>
      <MedicinesClient isVerified={session.shopVerified} />
    </div>
  );
}
