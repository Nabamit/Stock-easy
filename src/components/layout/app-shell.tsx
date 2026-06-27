"use client";

import { useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { logoutAction } from "@/lib/auth/actions";
import type { SessionPayload } from "@/types";
import { VerificationBanner } from "@/components/layout/verification-banner";
import { NotificationBell } from "@/components/layout/notification-bell";

interface AppShellProps {
  session: SessionPayload;
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ session, children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        session={session}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit" className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </form>
          </div>
        </header>

        <VerificationBanner session={session} />

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
