import { requireAdminSession } from "@/lib/auth/actions";
import { SupportAdminClient } from "@/components/admin/support-admin-client";

export const metadata = { title: "Customer Support" };
export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const session = await requireAdminSession();
  return (
    <div className="space-y-6">
      <SupportAdminClient adminSession={session} />
    </div>
  );
}
