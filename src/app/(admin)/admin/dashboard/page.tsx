import { getAdminDashboardData } from "@/lib/data/dashboard";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return <AdminDashboardClient initialKpis={data} activeTab="overview" />;
}
