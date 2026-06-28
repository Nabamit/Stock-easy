"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Filter, Edit2, Trash2, Loader2, Calendar, Ban, ShieldCheck } from "lucide-react";
import { toggleShopSuspensionAction } from "@/lib/admin/actions";
import { toast } from "sonner";

interface ShopsListClientProps {
  shops: any[];
  plans: any[];
  isSuper: boolean;
}

export function ShopsListClient({ shops, plans, isSuper }: ShopsListClientProps) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [editingShop, setEditingShop] = useState<any | null>(null);
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    ownerName: "",
    phone: "",
    city: "",
    state: "",
    isActive: true,
    subscriptionStatus: "trial",
    subscriptionPlanId: "",
  });

  const [isPending, startTransition] = useTransition();

  // Extract unique states for the filter dropdown
  const states = Array.from(new Set(shops.map((s) => s.state).filter(Boolean))).sort() as string[];

  // Filter logic
  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name?.toLowerCase().includes(search.toLowerCase()) ||
      shop.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      shop.city?.toLowerCase().includes(search.toLowerCase());

    const matchesState = stateFilter === "all" || shop.state === stateFilter;
    
    const matchesPlan =
      planFilter === "all" ||
      (planFilter === "trial" ? !shop.subscription_plan_id : shop.subscription_plan_id === planFilter);

    const matchesStatus =
      statusFilter === "all" || shop.subscription_status === statusFilter;

    const matchesActive =
      activeFilter === "all" ||
      (activeFilter === "active" ? shop.is_active === true : shop.is_active === false);

    const matchesDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const joined = new Date(shop.created_at);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (joined < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (joined > to) return false;
      }
      return true;
    })();

    return matchesSearch && matchesState && matchesPlan && matchesStatus && matchesActive && matchesDate;
  });

  const handleEditOpen = (shop: any) => {
    setEditingShop(shop);
    setEditForm({
      name: shop.name || "",
      ownerName: shop.owner_name || "",
      phone: shop.phone || "",
      city: shop.city || "",
      state: shop.state || "",
      isActive: shop.is_active ?? true,
      subscriptionStatus: shop.subscription_status || "trial",
      subscriptionPlanId: shop.subscription_plan_id || "",
    });
  };

  const handleEditSave = () => {
    if (!editingShop) return;
    startTransition(async () => {
      const { editShopAction } = await import("@/lib/admin/actions");
      const res = await editShopAction(
        editingShop.id,
        editForm.name,
        editForm.ownerName,
        editForm.phone,
        editForm.city,
        editForm.state,
        editForm.isActive,
        editForm.subscriptionStatus,
        editForm.subscriptionPlanId || null
      );
      if (res.success) {
        toast.success("Shop details updated successfully");
        setEditingShop(null);
      } else {
        toast.error(res.error || "Failed to update shop");
      }
    });
  };

  const handleDelete = (shopId: string, shopName: string) => {
    const confirm = window.confirm(
      `⚠️ DANGER ZONE: Are you sure you want to permanently delete pharmacy "${shopName}"?\n\nThis will immediately delete all billing histories, inventories, users, and transactions associated with it. This action is IRREVERSIBLE.`
    );
    if (!confirm) return;

    startTransition(async () => {
      const { deleteShopAction } = await import("@/lib/admin/actions");
      const res = await deleteShopAction(shopId);
      if (res.success) {
        toast.success(`Pharmacy "${shopName}" deleted successfully`);
      } else {
        toast.error(res.error || "Failed to delete shop");
      }
    });
  };

  const handleToggleSuspension = (shopId: string, isCurrentlySuspended: boolean) => {
    startTransition(async () => {
      const res = await toggleShopSuspensionAction(shopId, !isCurrentlySuspended);
      if (res.success) {
        toast.success(isCurrentlySuspended ? "Suspension revoked successfully!" : "Shop suspended successfully!");
        setConfirmBlockId(null);
      } else {
        toast.error(res.error || "Failed to update suspension status");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters flex row */}
      <div className="flex flex-wrap gap-3 bg-muted/30 p-4 rounded-xl border items-center text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, owner, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card text-xs rounded-lg"
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
            <option value="trial">Trial / Unsubscribed</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
            <option value="all">Sub Status</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="w-[140px] flex-shrink-0">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Account Status</option>
            <option value="active">Active Accounts</option>
            <option value="deactivated">Deactivated Accounts</option>
          </select>
        </div>

        <div className="flex gap-1.5 items-center flex-shrink-0">
          <span className="text-muted-foreground">Joined:</span>
          <Input
            type="date"
            title="Joined From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-card text-xs rounded-lg h-9 w-[125px]"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            title="Joined To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-card text-xs rounded-lg h-9 w-[125px]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <p className="flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Showing {filteredShops.length} of {shops.length} pharmacies
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground text-left">
                  <th className="px-4 py-3">Pharmacy Name</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">City & State</th>
                  <th className="px-4 py-3">Active Tier</th>
                  <th className="px-4 py-3">Active Status</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Joined Date</th>
                  {isSuper && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredShops.map((shop) => {
                  const plan = shop.subscription_plans as { name: string; price: number } | null;
                  return (
                    <tr key={shop.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 font-semibold text-foreground">{shop.name}</td>
                      <td className="px-4 py-3 font-medium">
                        {shop.owner_name}
                        {shop.phone && <span className="block text-[10px] text-muted-foreground">{shop.phone}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {shop.city}, <span className="text-muted-foreground">{shop.state}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-primary">{plan?.name ?? "Trial/None"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={shop.is_active ? "success" : "secondary"}>
                            {shop.is_active ? "ACTIVE" : "DEACTIVATED"}
                          </Badge>
                          {shop.is_suspended && (
                            <Badge variant="destructive" className="text-[10px] font-bold">
                              SUSPENDED
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            shop.verification_status === "approved"
                              ? "success"
                              : shop.verification_status === "pending"
                              ? "warning"
                              : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {shop.verification_status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            shop.subscription_status === "active" || shop.subscription_status === "trial"
                              ? "outline"
                              : "secondary"
                          }
                          className={`text-[10px] ${
                            shop.subscription_status === "active"
                              ? "border-emerald-600 text-emerald-600 bg-emerald-50/10"
                              : shop.subscription_status === "trial"
                              ? "border-cyan-600 text-cyan-600 bg-cyan-50/10"
                              : ""
                          }`}
                        >
                          {shop.subscription_status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(shop.created_at)}</td>
                      {isSuper && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {shop.is_suspended ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleSuspension(shop.id, true)}
                                className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-500 dark:hover:bg-emerald-950/20"
                                title="Revoke Suspension"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant={confirmBlockId === shop.id ? "destructive" : "ghost"}
                                size="sm"
                                onClick={() => {
                                  if (confirmBlockId === shop.id) {
                                    handleToggleSuspension(shop.id, false);
                                  } else {
                                    setConfirmBlockId(shop.id);
                                    // Reset confirmation state after 4 seconds
                                    setTimeout(() => setConfirmBlockId((prev) => prev === shop.id ? null : prev), 4000);
                                  }
                                }}
                                className={`h-7 px-2 ${
                                  confirmBlockId === shop.id 
                                    ? "animate-pulse font-semibold" 
                                    : "text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/20"
                                }`}
                                title={confirmBlockId === shop.id ? "Click again to confirm block" : "Suspend Shop"}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                {confirmBlockId === shop.id && (
                                  <span className="text-[10px] ml-1">Re-Verify</span>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOpen(shop)}
                              className="h-7 px-2 text-primary hover:bg-primary/10"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(shop.id, shop.name)}
                              className="h-7 px-2 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {!filteredShops.length && (
                  <tr>
                    <td colSpan={isSuper ? 9 : 8} className="py-12 text-center text-muted-foreground text-sm font-medium">
                      No pharmacy matching the selected filters was found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Shop Modal */}
      {editingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-background border rounded-xl shadow-2xl p-6 m-4 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-foreground border-b pb-3 mb-4">Edit Pharmacy Profile & Status</h3>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Pharmacy Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Owner Name</Label>
                  <Input
                    value={editForm.ownerName}
                    onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone Contact</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>State</Label>
                  <Input
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Platform Sub Plan</Label>
                  <select
                    value={editForm.subscriptionPlanId}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionPlanId: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">No Plan / Trial</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Subscription Status</Label>
                  <select
                    value={editForm.subscriptionStatus}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    id="isActiveToggle"
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <Label htmlFor="isActiveToggle" className="cursor-pointer">
                    Account Active Status
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-3 border-t">
                <Button variant="outline" onClick={() => setEditingShop(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={isPending} className="flex gap-1.5 items-center">
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
