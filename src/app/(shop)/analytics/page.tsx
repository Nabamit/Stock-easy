import { AnalyticsClient } from "@/components/analytics/analytics-client";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <p className="text-muted-foreground">Sales trends, expiry risk, and stock insights</p>
      </div>
      <AnalyticsClient />
    </div>
  );
}
