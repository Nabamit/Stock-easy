"use client";

import { useState, useTransition, useEffect } from "react";
import { Search, ShoppingBag, Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSalesHistoryAction, deleteSalesItemAction, updateSalesItemAction } from "@/lib/actions/bills";
import { formatCurrency, formatDate } from "@/lib/utils";

type SalesItem = Awaited<ReturnType<typeof getSalesHistoryAction>>[number];

interface SalesClientProps {
  userRole: "central_admin" | "shop_owner" | "shop_staff";
}

export function SalesClient({ userRole }: SalesClientProps) {
  const [search, setSearch] = useState("");
  const [sales, setSales] = useState<SalesItem[]>([]);
  const [filterType, setFilterType] = useState<"all" | "fresh" | "return">("all");
  const [isPending, startTransition] = useTransition();
  const [isActionPending, startAction] = useTransition();

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editDoctorName, setEditDoctorName] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);

  const isOwner = userRole === "shop_owner";

  function load(q?: string) {
    startTransition(async () => {
      const data = await getSalesHistoryAction(q);
      setSales(data);
    });
  }

  useEffect(() => {
    load();
  }, []);

  const filteredSales = sales.filter((item) => {
    if (filterType === "fresh") return !item.isReturn;
    if (filterType === "return") return item.isReturn;
    return true;
  });

  function startEditing(item: SalesItem) {
    setEditingId(item.id);
    setEditCustomerName(item.customerName);
    setEditCustomerPhone(item.customerPhone === "N/A" ? "" : item.customerPhone);
    setEditDoctorName(item.doctorName);
    setEditQuantity(item.quantity);
  }

  function handleSave(id: string) {
    if (editQuantity <= 0) {
      toast.error("Quantity must be a positive integer.");
      return;
    }
    startAction(async () => {
      const res = await updateSalesItemAction(id, {
        customerName: editCustomerName,
        customerPhone: editCustomerPhone,
        doctorName: editDoctorName,
        quantity: editQuantity,
      });
      if (res.success) {
        toast.success("Sales record updated successfully.");
        setEditingId(null);
        load(search);
      } else {
        toast.error(res.error ?? "Failed to update sales record.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this sales record? This will return the quantity back to inventory batches.")) return;
    startAction(async () => {
      const res = await deleteSalesItemAction(id);
      if (res.success) {
        toast.success("Sales record deleted successfully.");
        load(search);
      } else {
        toast.error(res.error ?? "Failed to delete sales record.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Controls: Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by bill, medicine, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(search)}
              className="pl-9 bg-card border-muted-foreground/20"
            />
          </div>
          <Button variant="outline" onClick={() => load(search)} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl border w-fit">
          {(["all", "fresh", "return"] as const).map((t) => (
            <Button
              key={t}
              variant={filterType === t ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-xs capitalize transition-all"
              onClick={() => setFilterType(t)}
            >
              {t === "all" ? "All Transactions" : t === "fresh" ? "Fresh Sales" : "Returns"}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <Card className="border shadow-sm overflow-hidden bg-card/60 backdrop-blur-md">
        <CardContent className="p-0">
          {isPending ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading sales transactions...</p>
              </div>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-base text-foreground">No sales records found</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {search ? "No records matched your search query. Try typing something else." : "Your shop has not recorded any sales transactions yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr className="divide-x divide-border">
                    <th className="px-4 py-3 text-left font-semibold text-foreground/80">Bill No</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/80">Medicine Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/80">Batch No</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground/80">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground/80">Item Total</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground/80">Bill Total</th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground/80">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/80">Cashier</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/80">Doctor</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/80">Customer Detail</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/80">Date</th>
                    {isOwner && <th className="px-4 py-3 text-center font-semibold text-foreground/80 w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {filteredSales.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-muted/15 transition-colors divide-x divide-border">
                        <td className="px-4 py-3 font-semibold text-foreground">{item.billNo}</td>
                        <td className="px-4 py-3 font-medium text-foreground/95">{item.medicineName}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.batchNo}</td>
                        <td className="px-4 py-3 text-center font-medium text-foreground">
                          {isEditing ? (
                            <Input
                              type="number"
                              min={1}
                              className="h-8 w-16 px-1.5 text-center text-xs mx-auto bg-background"
                              value={editQuantity}
                              disabled={isActionPending}
                              onChange={(e) => setEditQuantity(Number(e.target.value))}
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">{formatCurrency(item.lineTotal)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-medium">{formatCurrency(item.totalBillAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              item.isReturn
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                            }
                          >
                            {item.isReturn ? "Return" : "Fresh"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-foreground/90 font-medium">{item.cashierName}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <Input
                              className="h-8 px-1.5 text-xs max-w-[120px] bg-background"
                              value={editDoctorName}
                              disabled={isActionPending}
                              onChange={(e) => setEditDoctorName(e.target.value)}
                            />
                          ) : (
                            <span className="text-foreground/90">{item.doctorName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-1 max-w-[150px]">
                              <Input
                                className="h-7 px-1.5 text-xs bg-background"
                                value={editCustomerName}
                                disabled={isActionPending}
                                onChange={(e) => setEditCustomerName(e.target.value)}
                                placeholder="Customer Name"
                              />
                              <Input
                                className="h-7 px-1.5 text-xs bg-background"
                                value={editCustomerPhone}
                                disabled={isActionPending}
                                onChange={(e) => setEditCustomerPhone(e.target.value)}
                                placeholder="Phone Number"
                              />
                            </div>
                          ) : (
                            <div className="text-xs">
                              <p className="font-semibold text-foreground/90">{item.customerName}</p>
                              <p className="text-muted-foreground mt-0.5">{item.customerPhone}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(item.createdAt)}</td>
                        {isOwner && (
                          <td className="px-4 py-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  onClick={() => handleSave(item.id)}
                                  disabled={isActionPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setEditingId(null)}
                                  disabled={isActionPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-primary hover:bg-primary/10"
                                  onClick={() => startEditing(item)}
                                  disabled={isActionPending}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={isActionPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
