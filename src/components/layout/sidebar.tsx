"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Pill,
  Package,
  Warehouse,
  Truck,
  BarChart3,
  Bot,
  FileText,
  Settings,
  X,
  ShieldCheck,
  Store,
  CreditCard,
  Users,
  History,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import type { SessionPayload } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const shopNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/billing", label: "New Bill", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/medicines", label: "Medicines", icon: Pill },
  { href: "/dealers", label: "Dealers", icon: Truck },
  { href: "/stock", label: "Stock & Batches", icon: Package },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai", label: "AI Assistant", icon: Bot },
  { href: "/bills", label: "Bills History", icon: FileText },
  { href: "/sales", label: "Sales History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/shops", label: "All Shops", icon: Store },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/panel", label: "Admin Panel", icon: Users },
  { href: "/admin/support", label: "Customer Support", icon: LifeBuoy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  session: SessionPayload;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ session, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = session.role === "central_admin";
  const isStaff = session.role === "shop_staff";
  const isSuspended = !!(session as any).isSuspended;

  const nav = isAdmin 
    ? adminNav 
    : isSuspended
      ? shopNav.filter((item) => item.href === "/settings")
      : isStaff
        ? shopNav.filter((item) => ["/billing", "/inventory", "/ai", "/bills", "/sales"].includes(item.href))
        : shopNav;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Pill className="h-4 w-4" />
            </div>
            <span className="font-bold text-primary">{APP_NAME}</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b px-4 py-3 flex items-center gap-3 bg-muted/10">
          {!isAdmin ? (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border text-sm uppercase">
              {session.shopPhotoUrl ? (
                <img src={session.shopPhotoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                (session.shopName ?? "P").charAt(0)
              )}
            </div>
          ) : (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center border text-sm uppercase">
              A
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{session.name}</p>
            <p className="truncate text-xs text-muted-foreground" title={isAdmin ? "Central Admin" : isStaff ? `Staff of ${session.shopName}` : session.shopName || ""}>
              {isAdmin 
                ? "Central Admin" 
                : isStaff
                  ? `Staff of ${session.shopName}`
                  : session.shopName
              }
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
