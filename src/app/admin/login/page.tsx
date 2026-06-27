import Link from "next/link";
import { Shield } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-sm font-medium text-muted-foreground">{APP_NAME}</h2>
        </div>
        <LoginForm
          title="Central Admin"
          subtitle="Platform administration access"
        />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {/* Test: nabamitdutta14@gmail.com / Nabamitdutta@1442002 */}
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-primary hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
