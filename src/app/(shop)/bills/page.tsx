import { BillsClient } from "@/components/bills/bills-client";

export const metadata = { title: "Bills History" };
export const dynamic = "force-dynamic";

export default function BillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bills History</h2>
        <p className="text-muted-foreground">Search bills, print, and process returns</p>
      </div>
      <BillsClient />
    </div>
  );
}
