"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Filter } from "lucide-react";

interface BillingListClientProps {
  payments: any[];
}

export function BillingListClient({ payments }: BillingListClientProps) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Extract states and plans for dropdown filters
  const states = Array.from(
    new Set(payments.map((p) => (p.shops as any)?.state).filter(Boolean))
  ).sort() as string[];

  const plans = Array.from(
    new Set(payments.map((p) => (p.subscription_plans as any)?.name).filter(Boolean))
  ).sort() as string[];

  const filteredPayments = payments.filter((p) => {
    const shop = p.shops as any;
    const plan = p.subscription_plans as any;

    const matchesSearch =
      shop?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.razorpay_payment_id?.toLowerCase().includes(search.toLowerCase()) ||
      shop?.city?.toLowerCase().includes(search.toLowerCase());

    const matchesState = stateFilter === "all" || shop?.state === stateFilter;
    const matchesPlan = planFilter === "all" || plan?.name === planFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;

    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const paidDate = new Date(p.paid_at || p.created_at);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (paidDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (paidDate > to) return false;
      }
      return true;
    })();

    return matchesSearch && matchesState && matchesPlan && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters flex row */}
      <div className="flex flex-wrap gap-3 bg-muted/30 p-4 rounded-xl border items-center text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by shop, payment ID, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card text-xs rounded-lg h-9"
          />
        </div>

        <div className="w-[140px] flex-shrink-0">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All States</option>
            {states.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="w-[140px] flex-shrink-0">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Plans</option>
            {plans.map((pl) => (
              <option key={pl} value={pl}>
                {pl}
              </option>
            ))}
          </select>
        </div>

        <div className="w-[140px] flex-shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex gap-1.5 items-center flex-shrink-0">
          <span className="text-muted-foreground">Paid:</span>
          <Input
            type="date"
            title="Paid From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-card text-xs rounded-lg h-9 w-[125px]"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            title="Paid To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-card text-xs rounded-lg h-9 w-[125px]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <p className="flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Showing {filteredPayments.length} of {payments.length} billing records
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground text-left text-xs">
                  <th className="px-4 py-3">Shop</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment ID</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs sm:text-sm">
                {filteredPayments.map((p) => {
                  const shop = p.shops as { name: string; city: string; state: string } | null;
                  const plan = p.subscription_plans as { name: string; price: number } | null;
                  return (
                    <tr key={p.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {shop?.name || "Deleted Shop"}
                        <span className="block text-[10px] text-muted-foreground font-normal">
                          {shop?.city}, {shop?.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{plan?.name || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(p.amount))}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.status === "completed" ? "success" : p.status === "pending" ? "warning" : "destructive"}>
                          {p.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.razorpay_payment_id || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.paid_at || p.created_at)}</td>
                    </tr>
                  );
                })}
                {!filteredPayments.length && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm font-medium">
                      No billing records found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
