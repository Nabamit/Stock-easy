import { requireVerifiedShopSession } from "@/lib/auth/actions";
import { AppShell } from "@/components/layout/app-shell";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireVerifiedShopSession();

  return <AppShell session={session}>{children}</AppShell>;
}
