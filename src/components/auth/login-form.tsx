"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  isFirebaseSimulated 
} from "@/lib/firebase";
import { firebaseLoginAction } from "@/lib/auth/actions";
import { toast } from "sonner";

interface LoginFormProps {
  title?: string;
  subtitle?: string;
  isAdmin?: boolean; // Declared here to fix the type check
}

export function LoginForm({
  title = "Shop Login",
  subtitle = "Sign in to manage your pharmacy",
  isAdmin = false, // Formally initialized here to fix the ReferenceError
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bypassEmailCheck, setBypassEmailCheck] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    startTransition(async () => {
      try {
        let verifiedEmail = email;
        
        // Try Firebase auth if not simulated
        if (!isFirebaseSimulated()) {
          try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            if (!userCred.user.emailVerified && !bypassEmailCheck) {
              await sendEmailVerification(userCred.user);
              toast.error("Your email is not verified yet. We have sent a verification link to your inbox.");
              return;
            }
            verifiedEmail = userCred.user.email || email;
          } catch (firebaseError: any) {
            // Firebase auth failed, try database-only auth for development/seeded accounts
            console.warn("Firebase auth failed, attempting database auth:", firebaseError.code);
            // Fall through to use email directly with firebaseLoginAction
            verifiedEmail = email;
          }
        } else {
          // Simulation mode
          toast.info("Simulation Mode: Authenticating mock credentials.");
        }

        const result = await firebaseLoginAction(verifiedEmail, password);
        if (result.success) {
          toast.success("Logged in successfully!");
          if (result.redirectUrl) {
            // Use a small delay to ensure the httpOnly cookie is set before navigating
            setTimeout(() => {
              window.location.href = result.redirectUrl!;
            }, 500);
          }
        } else {
          toast.error(result.error || "Login failed");
        }
      } catch (e: any) {
        toast.error(e.message || "Invalid email or password.");
      }
    });
  };

  const handleGoogleLogin = () => {
    startTransition(async () => {
      try {
        let verifiedEmail = "";
        if (!isFirebaseSimulated()) {
          const userCred = await signInWithPopup(auth, googleProvider);
          verifiedEmail = userCred.user.email || "";
        } else {
          toast.info("Simulation Mode: Logging in via mock Google Sign-In.");
          verifiedEmail = "owner1@test.com"; 
        }

        if (!verifiedEmail) {
          toast.error("Could not retrieve email from Google Account.");
          return;
        }

        const result = await firebaseLoginAction(verifiedEmail);
        if (result.success) {
          toast.success("Logged in with Google successfully!");
          if (result.redirectUrl) {
            // Use a small delay to ensure the httpOnly cookie is set before navigating
            setTimeout(() => {
              window.location.href = result.redirectUrl!;
            }, 500);
          }
        } else {
          toast.error(result.error || "Google login failed");
        }
      } catch (e: any) {
        toast.error(e.message || "Google sign-in failed.");
      }
    });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="owner@pharmacy.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
          />
        </div>

        {/* {!isAdmin && (
          <div className="flex items-center space-x-2 py-1">
            <input
              type="checkbox"
              id="bypassEmailCheck"
              checked={bypassEmailCheck}
              onChange={(e) => setBypassEmailCheck(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <label htmlFor="bypassEmailCheck" className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
              Bypass email verification check (for demo/testing)
            </label>
          </div>
        )} */}

        <Button type="submit" className="w-full font-semibold" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button variant="outline" type="button" className="w-full gap-2 border shadow-sm font-semibold" onClick={handleGoogleLogin} disabled={isPending}>
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.13h3.98c2.33-2.14 3.66-5.29 3.66-8.75z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.98-3.13c-1.1.74-2.52 1.18-3.98 1.18-3.08 0-5.69-2.08-6.62-4.88H1.32v3.23A11.99 11.99 0 0 0 12 24z"/>
          <path fill="#FBBC05" d="M5.38 14.26a7.22 7.22 0 0 1 0-2.52V8.51H1.32a11.98 11.98 0 0 0 0 6.98l4.06-3.23z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.29 2.69 1.32 6.6l4.06 3.23c.93-2.8 3.54-4.88 6.62-4.88z"/>
        </svg>
        Sign in with Google
      </Button>

      {!isAdmin && (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register your shop
          </Link>
        </p>
      )}
    </div>
  );
}