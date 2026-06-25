import Link from "next/link";
import { Pill } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Pill className="h-4 w-4" />
          </div>
          <span className="font-bold text-primary">{APP_NAME}</span>
        </Link>
      </header>
      <div className="flex justify-center px-4 py-10 sm:px-6">
        <RegisterForm />
      </div>
    </div>
  );
}
