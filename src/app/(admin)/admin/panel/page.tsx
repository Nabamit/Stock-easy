import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const metadata = { title: "Admin Panel" };
export const dynamic = "force-dynamic";

export default async function AdminPanelPage() {
  const dummyKpis = {
    totalShops: 0,
    pendingCount: 0,
    approvedCount: 0,
    totalUsers: 0,
    platformRevenue: 0,
    shops: [],
    totalMedicines: 0,
    totalBills: 0,
    planDistribution: [],
  };

  return <AdminDashboardClient initialKpis={dummyKpis} activeTab="panel" />;
}
