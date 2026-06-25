"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMedicinesAction,
  createMedicineAction,
  getDiscountClustersAction,
  ensureDefaultClustersAction,
} from "@/lib/actions/medicines";
import { formatDate } from "@/lib/utils";
import { ExpiryBadge } from "@/components/shared/expiry-badge";

type MedicineRow = Awaited<ReturnType<typeof getMedicinesAction>>["data"][number];
type Cluster = { id: string; name: string; discount_percent: number };

export function MedicinesClient() {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    generic_name: "",
    manufacturer: "",
    category: "",
    min_stock_level: 10,
    discount_cluster_id: "",
  });

  function load(q?: string) {
    startTransition(async () => {
      await ensureDefaultClustersAction();
      const [medRes, cls] = await Promise.all([
        getMedicinesAction(q),
        getDiscountClustersAction(),
      ]);
      if (medRes.success) setMedicines(medRes.data);
      setClusters(cls as Cluster[]);
    });
  }

  useEffect(() => { load(); }, []);

  function handleCreate() {
    startTransition(async () => {
      const result = await createMedicineAction({
        ...form,
        unit: "strip",
        hsn_code: "3004",
        gst_rate: 5,
        discount_cluster_id: form.discount_cluster_id || null,
      });
      if (result.success) {
        toast.success("Medicine added");
        setShowForm(false);
        load(search);
      } else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search medicines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
          />
          <Button variant="outline" onClick={() => load(search)} disabled={isPending}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add Medicine
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Medicine</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Generic</Label><Input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} /></div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Min Stock Level</Label><Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: Number(e.target.value) })} /></div>
            <div>
              <Label>Discount Cluster</Label>
              <select className="flex h-10 w-full rounded-lg border px-3 text-sm" value={form.discount_cluster_id} onChange={(e) => setForm({ ...form, discount_cluster_id: e.target.value })}>
                <option value="">None</option>
                {clusters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.discount_percent}%)</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button onClick={handleCreate} disabled={isPending || !form.name}>
                {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save Medicine
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Generic</th>
                  <th className="px-4 py-3 text-left">Manufacturer</th>
                  <th className="px-4 py-3 text-right">Total Qty</th>
                  <th className="px-4 py-3 text-left">Nearest Expiry</th>
                  <th className="px-4 py-3 text-left">Discount</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const cluster = m.discount_clusters as { discount_percent: number } | null;
                  return (
                    <tr key={m.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">{m.generic_name ?? "—"}</td>
                      <td className="px-4 py-3">{m.manufacturer ?? "—"}</td>
                      <td className="px-4 py-3 text-right">{m.totalQty}</td>
                      <td className="px-4 py-3">
                        {m.nearestExpiry ? (
                          <span className="flex items-center gap-2">
                            {formatDate(m.nearestExpiry)}
                            <ExpiryBadge expiryDate={m.nearestExpiry} />
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">{cluster ? `${cluster.discount_percent}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
