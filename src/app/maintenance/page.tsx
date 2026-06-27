import Link from "next/link";
import { Wrench, Shield } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: `Under Maintenance - ${APP_NAME}` };

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 animate-pulse">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Site Under Maintenance</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {APP_NAME} is currently undergoing scheduled systems maintenance to improve our stock management pipelines. 
          We expect to be back online shortly.
        </p>
        <div className="mt-6 border-t pt-4 text-xs text-muted-foreground flex flex-col gap-4">
          <p>Thank you for your patience! For urgent support, contact central administration.</p>
          <div className="flex justify-center">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground shadow-sm"
            >
              <Shield className="h-3.5 w-3.5" />
              Central Admin Gateway
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
