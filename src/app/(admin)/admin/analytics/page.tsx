import { PlatformAnalyticsClient } from "@/components/admin/platform-analytics-client";

export const metadata = { title: "Platform Analytics" };
export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Analytics</h2>
        <p className="text-muted-foreground">Cross-tenant metrics, shop growth, and expiry loss</p>
      </div>
      <PlatformAnalyticsClient />
    </div>
  );
}
