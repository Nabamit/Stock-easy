import { SettingsClient } from "@/components/settings/settings-client";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings & Profile</h2>
        <p className="text-muted-foreground">Shop profile, staff, password, and subscription</p>
      </div>
      <SettingsClient />
    </div>
  );
}
