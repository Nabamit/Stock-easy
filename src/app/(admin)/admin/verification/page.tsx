import { getDb } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/auth/actions";
import { getVerificationHistoryAction } from "@/lib/admin/actions";
import { VerificationClient } from "@/components/admin/verification-client";

export const metadata = { title: "Shop Verification Center" };
export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  const session = await requireAdminSession();
  const db = getDb();

  // Fetch pending shops
  const { data: pendingShops } = await db
    .from("shops")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  // Check if current user is Super Admin
  const { data: user } = await db
    .from("users")
    .select("is_super")
    .eq("id", session.userId)
    .single();
  const isSuper = user?.is_super ?? false;

  // Retrieve initial audit logs for history tab
  let initialHistoryShops: any[] = [];
  if (isSuper) {
    initialHistoryShops = await getVerificationHistoryAction();
  }

  return (
    <VerificationClient
      pendingShops={pendingShops ?? []}
      isSuper={isSuper}
      initialHistoryShops={initialHistoryShops}
    />
  );
}
