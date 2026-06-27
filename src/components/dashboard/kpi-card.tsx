import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
  iconClassName?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden group transition-all duration-300 hover:shadow-md hover:-translate-y-0.5", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate" title={title}>{title}</p>
            <p className={cn(
              "font-bold tracking-tight break-words text-xl sm:text-2xl",
              typeof value === "string" && value.length > 10 && "text-lg sm:text-xl"
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate" title={subtitle}>{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-105",
              iconClassName ?? "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
