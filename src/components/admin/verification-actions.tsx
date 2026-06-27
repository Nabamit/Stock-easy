"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveShopAction, rejectShopAction } from "@/lib/admin/actions";

export function VerificationActions({ shopId }: { shopId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveShopAction(shopId);
      if (result.success) {
        toast.success("Shop approved successfully");
      } else {
        toast.error(result.error ?? "Failed to approve");
      }
    });
  }

  function handleReject() {
    const notes = window.prompt("Enter rejection notes/reason (optional):");
    if (notes === null) return; // User clicked Cancel
    
    startTransition(async () => {
      const result = await rejectShopAction(shopId, notes || undefined);
      if (result.success) {
        toast.success("Shop rejected successfully");
      } else {
        toast.error(result.error ?? "Failed to reject");
      }
    });
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleApprove}
        disabled={isPending}
        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        Approve
      </Button>
      <Button
        variant="destructive"
        onClick={handleReject}
        disabled={isPending}
        className="gap-2"
      >
        <XCircle className="h-4 w-4" />
        Reject
      </Button>
    </div>
  );
}
