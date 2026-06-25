import { cn, getExpiryUrgency } from "@/lib/utils";

export function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const urgency = getExpiryUrgency(expiryDate);
  const labels = {
    expired: "Expired",
    critical: "≤30 days",
    warning: "≤90 days",
    normal: "Safe",
  };
  const colors = {
    expired: "bg-red-100 text-red-800 border-red-200",
    critical: "bg-orange-100 text-orange-800 border-orange-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    normal: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", colors[urgency])}>
      {labels[urgency]}
    </span>
  );
}

export function expiryRowClass(expiryDate: string): string {
  const urgency = getExpiryUrgency(expiryDate);
  return {
    expired: "bg-red-50",
    critical: "bg-orange-50",
    warning: "bg-amber-50",
    normal: "",
  }[urgency];
}
