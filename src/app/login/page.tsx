import Link from "next/link";
import { Pill } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";


export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-primary to-secondary p-12 lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
            <Pill className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">{APP_NAME}</span>
        </Link>
        <div className="text-white">
          <h2 className="text-3xl font-bold">Manage Your Pharmacy Smarter</h2>
          <p className="mt-4 text-white/80">
            FEFO-powered stock management to minimize expiry losses and maximize
            profits.
          </p>
        </div>
        <p className="text-sm text-white/60">
          Test account: owner1@test.com / owner123
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <LoginForm />
      </div>
    </div>
  );
}
