"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInventoryOverviewAction } from "@/lib/actions/batches";
import { formatDate } from "@/lib/utils";
import { ExpiryBadge, expiryRowClass } from "@/components/shared/expiry-badge";

type Filter = "all" | "expiring" | "low" | "dead";

export function InventoryClient({ isVerified = true }: { isVerified?: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Awaited<ReturnType<typeof getInventoryOverviewAction>>>([]);
  const [isPending, startTransition] = useTransition();

  function load(f: Filter) {
    startTransition(async () => {
      const data = await getInventoryOverviewAction(f === "all" ? undefined : f);
      setItems(data);
    });
  }

  useEffect(() => { load(filter); }, [filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All Stock" },
    { key: "expiring", label: "Expiring Soon (≤90d)" },
    { key: "low", label: "Low Stock" },
    { key: "dead", label: "Dead / Expired" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            disabled={isPending}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filters.find((f) => f.key === filter)?.label} ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Medicine</th>
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-left">Days Left</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => {
                  const med = b.medicines as { name: string; generic_name: string };
                  // Cast item to access new property flags
                  const item = b as any;
                  return (
                    <tr key={b.id} className={`border-b ${item.isOutOfStock ? "bg-red-50/20" : b.expiry_date ? expiryRowClass(b.expiry_date) : ""}`}>
                      <td className="px-4 py-3 font-medium">{med?.name}</td>
                      <td className="px-4 py-3 font-mono">{b.batch_no}</td>
                      <td className="px-4 py-3">{b.expiry_date ? formatDate(b.expiry_date) : "—"}</td>
                      <td className="px-4 py-3 text-right">{b.quantity_remaining}</td>
                      <td className="px-4 py-3">{b.daysToExpiry !== null ? b.daysToExpiry : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {item.isOutOfStock ? (
                            <span className="rounded-full border px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 border-red-200">
                              Out of Stock
                            </span>
                          ) : (
                            <>
                              {item.isLowStock && (
                                <span className="rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 border-amber-200">
                                  Low Stock
                                </span>
                              )}
                              {b.expiry_date && <ExpiryBadge expiryDate={b.expiry_date} />}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!items.length && (
              <p className="py-12 text-center text-muted-foreground">No items match this filter</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
