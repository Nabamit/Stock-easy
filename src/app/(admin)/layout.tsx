import { requireAdminSession } from "@/lib/auth/actions";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();

  return <AppShell session={session}>{children}</AppShell>;
}
