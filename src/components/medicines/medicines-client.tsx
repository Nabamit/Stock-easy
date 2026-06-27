"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Search, Loader2, Edit, Trash2, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMedicinesAction,
  createMedicineAction,
  updateMedicineAction,
  deleteMedicineAction,
  getDiscountClustersAction,
  ensureDefaultClustersAction,
} from "@/lib/actions/medicines";
import { formatDate } from "@/lib/utils";
import { ExpiryBadge } from "@/components/shared/expiry-badge";

type MedicineRow = Awaited<ReturnType<typeof getMedicinesAction>>["data"][number];
type Cluster = { id: string; name: string; discount_percent: number };

export function MedicinesClient({ isVerified = true }: { isVerified?: boolean }) {
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [search, setSearch] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    generic_name: "",
    manufacturer: "",
    category: "",
    min_stock_level: 10,
    discount_cluster_id: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    generic_name: "",
    manufacturer: "",
    category: "",
    min_stock_level: 10,
    discount_cluster_id: "",
  });

  function load(q?: string, bq?: string) {
    startTransition(async () => {
      await ensureDefaultClustersAction();
      const [medRes, cls] = await Promise.all([
        getMedicinesAction(q, bq),
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
        setForm({
          name: "",
          generic_name: "",
          manufacturer: "",
          category: "",
          min_stock_level: 10,
          discount_cluster_id: "",
        });
        load(search, batchSearch);
      } else toast.error(result.error);
    });
  }

  function handleUpdate() {
    if (!editingMedicine) return;
    startTransition(async () => {
      const result = await updateMedicineAction(editingMedicine.id, {
        ...editForm,
        unit: editingMedicine.unit,
        hsn_code: editingMedicine.hsn_code,
        gst_rate: Number(editingMedicine.gst_rate),
        discount_cluster_id: editForm.discount_cluster_id || null,
      });
      if (result.success) {
        toast.success("Medicine updated");
        setEditingMedicine(null);
        load(search, batchSearch);
      } else toast.error(result.error);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    startTransition(async () => {
      const result = await deleteMedicineAction(id);
      if (result.success) {
        toast.success("Medicine deleted");
        load(search, batchSearch);
      } else toast.error(result.error);
    });
  }

  function openEdit(med: MedicineRow) {
    setEditingMedicine(med);
    setEditForm({
      name: med.name,
      generic_name: med.generic_name || "",
      manufacturer: med.manufacturer || "",
      category: med.category || "",
      min_stock_level: med.min_stock_level || 10,
      discount_cluster_id: med.discount_cluster_id || "",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search name or generic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search, batchSearch)}
          />
          <Input
            placeholder="Search by batch number..."
            value={batchSearch}
            onChange={(e) => setBatchSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search, batchSearch)}
          />
          <Button variant="outline" onClick={() => load(search, batchSearch)} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <Button 
          onClick={() => isVerified && setShowForm(!showForm)} 
          disabled={!isVerified}
          className={!isVerified ? "opacity-75 cursor-not-allowed" : ""}
        >
          {isVerified ? <Plus className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />} Add Medicine {!isVerified && "(Locked)"}
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

      {/* Editing Modal Dialog */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <Card className="w-full max-w-lg border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
              <CardTitle className="text-base">Edit Medicine Details</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingMedicine(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><Label>Generic</Label><Input value={editForm.generic_name} onChange={(e) => setEditForm({ ...editForm, generic_name: e.target.value })} /></div>
              <div><Label>Manufacturer</Label><Input value={editForm.manufacturer} onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} /></div>
              <div><Label>Min Stock Level</Label><Input type="number" value={editForm.min_stock_level} onChange={(e) => setEditForm({ ...editForm, min_stock_level: Number(e.target.value) })} /></div>
              <div>
                <Label>Discount Cluster</Label>
                <select className="flex h-10 w-full rounded-lg border px-3 text-sm" value={editForm.discount_cluster_id} onChange={(e) => setEditForm({ ...editForm, discount_cluster_id: e.target.value })}>
                  <option value="">None</option>
                  {clusters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.discount_percent}%)</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-4 mt-2">
                <Button variant="outline" onClick={() => setEditingMedicine(null)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={isPending || !editForm.name}>
                  {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Update Medicine
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Generic</th>
                  <th className="px-4 py-3 text-left">Batch No</th>
                  <th className="px-4 py-3 text-left">Dealer</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-left">Discount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m, idx) => {
                  const cluster = m.discount_clusters as { discount_percent: number } | null;
                  return (
                    <tr key={`${m.id}-${m.batchId || idx}`} className="border-b">
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">{m.generic_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{m.batchNo}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.dealerName}</td>
                      <td className="px-4 py-3 text-right font-medium">{m.quantityRemaining}</td>
                      <td className="px-4 py-3">
                        {m.expiryDate ? (
                          <span className="flex items-center gap-2">
                            {formatDate(m.expiryDate)}
                            <ExpiryBadge expiryDate={m.expiryDate} />
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">{cluster ? `${cluster.discount_percent}%` : "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(m)} disabled={!isVerified}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(m.id, m.name)} disabled={!isVerified}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!medicines.length && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No medicines match the search criteria.
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
