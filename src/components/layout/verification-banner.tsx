"use client";

import { Clock, Mail, AlertTriangle } from "lucide-react";
import type { SessionPayload } from "@/types";

interface VerificationBannerProps {
  session: SessionPayload;
}

export function VerificationBanner({ session }: VerificationBannerProps) {
  if (session.role === "central_admin" || session.shopVerified) {
    return null;
  }

  return (
    <div className="relative overflow-hidden border-b border-amber-200 bg-gradient-to-r from-amber-50/90 via-amber-100/70 to-amber-50/90 px-4 py-4 dark:border-amber-950 dark:from-amber-950/20 dark:via-amber-900/10 dark:to-amber-950/20 sm:px-6 shadow-inner">
      {/* Decorative accent light effect */}
      <div className="absolute -top-10 left-1/2 h-20 w-80 -translate-x-1/2 bg-amber-300/30 blur-2xl rounded-full" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-sm border border-amber-200/50 dark:bg-amber-900/50 dark:text-amber-400 dark:border-amber-800/50 animate-pulse">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm uppercase tracking-wider">
                  Verification Pending
                </h3>
                <span className="inline-flex items-center rounded-full bg-amber-200/60 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  Under Review
                </span>
              </div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mt-1">
                Hi <strong className="font-bold text-amber-900 dark:text-amber-200">{session.name}</strong>, your shop <strong className="font-bold text-amber-900 dark:text-amber-200">{session.shopName}</strong> is under review by our central team.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-amber-750 dark:text-amber-400 md:border-l md:border-amber-300/40 dark:md:border-amber-800/40 md:pl-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                We&apos;ll notify you at{" "}
                <strong className="font-semibold text-amber-900 dark:text-amber-200 underline decoration-amber-400/50 underline-offset-2">
                  {session.email}
                </strong>{" "}
                once approved.
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-amber-850 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>This usually takes 24–48 hours. Please ensure all documents are valid.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
