import { StockClient } from "@/components/stock/stock-client";

export const metadata = { title: "Stock & Batches" };
export const dynamic = "force-dynamic";

export default function StockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Stock Entry & Batches</h2>
        <p className="text-muted-foreground">Add stock and view batches color-coded by expiry urgency</p>
      </div>
      <StockClient />
    </div>
  );
}
