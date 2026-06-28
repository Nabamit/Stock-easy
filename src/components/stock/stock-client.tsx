"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Edit, Trash2, X, Upload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createBatchAction,
  getBatchesAction,
  updateBatchAction,
  deleteBatchAction,
  bulkImportBatchesAction
} from "@/lib/actions/batches";
import { getMedicinesAction } from "@/lib/actions/medicines";
import { getDealersAction } from "@/lib/actions/dealers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExpiryBadge, expiryRowClass } from "@/components/shared/expiry-badge";

type BatchType = Awaited<ReturnType<typeof getBatchesAction>>["data"][number];

export function StockClient({ isVerified = true }: { isVerified?: boolean }) {
  const [batches, setBatches] = useState<BatchType[]>([]);
  const [medicines, setMedicines] = useState<{ id: string; name: string }[]>([]);
  const [dealers, setDealers] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchType | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({
    medicine_id: "",
    dealer_id: "",
    batch_no: "",
    expiry_date: "",
    quantity_initial: 1,
    cost_price: 0,
    selling_price: 0,
  });

  const [editForm, setEditForm] = useState({
    batch_no: "",
    expiry_date: "",
    quantity_remaining: 0,
    cost_price: 0,
    selling_price: 0,
    dealer_id: "",
  });

  function load() {
    startTransition(async () => {
      const [b, m, d] = await Promise.all([
        getBatchesAction(),
        getMedicinesAction(),
        getDealersAction(),
      ]);
      if (b.success) setBatches(b.data);
      if (m.success) {
        const uniqueMeds: { id: string; name: string }[] = [];
        const seen = new Set<string>();
        for (const x of m.data) {
          if (!seen.has(x.id)) {
            seen.add(x.id);
            uniqueMeds.push({ id: x.id, name: x.name });
          }
        }
        setMedicines(uniqueMeds);
      }
      setDealers(d.map((x) => ({ id: x.id, name: x.name })));
    });
  }

  useEffect(() => { load(); }, []);

  function handleAdd() {
    startTransition(async () => {
      const result = await createBatchAction({
        ...form,
        dealer_id: form.dealer_id || null,
      });
      if (result.success) {
        toast.success("Stock added");
        setShowForm(false);
        setForm({
          medicine_id: "",
          dealer_id: "",
          batch_no: "",
          expiry_date: "",
          quantity_initial: 1,
          cost_price: 0,
          selling_price: 0,
        });
        load();
      } else toast.error(result.error);
    });
  }

  function handleUpdate() {
    if (!editingBatch) return;
    startTransition(async () => {
      const result = await updateBatchAction(editingBatch.id, {
        ...editForm,
        dealer_id: editForm.dealer_id || null,
      });
      if (result.success) {
        toast.success("Batch updated successfully");
        setEditingBatch(null);
        load();
      } else toast.error(result.error);
    });
  }

  function handleDelete(id: string, batchNo: string) {
    if (!confirm(`Are you sure you want to delete batch: ${batchNo}?`)) return;
    startTransition(async () => {
      const result = await deleteBatchAction(id);
      if (result.success) {
        toast.success("Batch deleted successfully");
        load();
      } else toast.error(result.error);
    });
  }

  function openEdit(b: BatchType) {
    setEditingBatch(b);
    setEditForm({
      batch_no: b.batch_no,
      expiry_date: b.expiry_date,
      quantity_remaining: b.quantity_remaining,
      cost_price: Number(b.cost_price),
      selling_price: Number(b.selling_price),
      dealer_id: b.dealer_id || "",
    });
  }

  // CSV parsing logic
  function parseCSV(text: string) {
    const lines = text.split(/\r\n|\n/);
    if (lines.length === 0) return [];

    // Parse headers, trim spaces and strip outer quotes
    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));

    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields: string[] = [];
      let currentField = "";
      let insideQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
          fields.push(currentField.trim());
          currentField = "";
        } else {
          currentField += char;
        }
      }
      fields.push(currentField.trim());

      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = fields[idx] || "";
      });
      results.push(row);
    }
    return results;
  }

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      startTransition(async () => {
        try {
          const parsedData = parseCSV(text);
          if (parsedData.length === 0) {
            toast.error("CSV is empty or invalid.");
            return;
          }

          const res = await bulkImportBatchesAction(parsedData);
          if (res.success) {
            toast.success(`Import success! Added: ${res.importedCount}, Errors/Skipped: ${res.errorCount}`);
            load();
          } else {
            toast.error("CSV Import failed.");
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to import CSV.");
        }
      });
    };
    reader.readAsText(file);
    e.target.value = ""; // Clear file picker
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Bulk CSV Import</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="max-w-[240px] text-xs h-9 cursor-pointer"
              disabled={isPending || !isVerified}
            />
            <Button variant="outline" size="sm" className="gap-1 text-xs h-9" disabled={isPending || !isVerified}>
              {isVerified ? <Upload className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Import CSV
            </Button>
          </div>
        </div>
        <Button
          onClick={() => isVerified && setShowForm(!showForm)}
          disabled={!isVerified}
          className={!isVerified ? "opacity-75 cursor-not-allowed" : ""}
        >
          {isVerified ? <Plus className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />} Add Stock {!isVerified && "(Locked)"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add Stock Batch</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Medicine *</Label>
              <select className="flex h-10 w-full rounded-lg border px-3 text-sm" value={form.medicine_id} onChange={(e) => setForm({ ...form, medicine_id: e.target.value })}>
                <option value="">Select</option>
                {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Dealer</Label>
              <select className="flex h-10 w-full rounded-lg border px-3 text-sm" value={form.dealer_id} onChange={(e) => setForm({ ...form, dealer_id: e.target.value })}>
                <option value="">Select</option>
                {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><Label>Batch No *</Label><Input value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} /></div>
            <div><Label>Expiry Date *</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div><Label>Quantity *</Label><Input type="number" value={form.quantity_initial} onChange={(e) => setForm({ ...form, quantity_initial: Number(e.target.value) })} /></div>
            <div><Label>Cost Price *</Label><Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} /></div>
            <div><Label>Selling Price *</Label><Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} /></div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={isPending || !form.medicine_id || !form.batch_no}>
                {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editing Dialog Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <Card className="w-full max-w-lg border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
              <CardTitle className="text-base">Edit Stock Batch Details</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingBatch(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Batch No *</Label><Input value={editForm.batch_no} onChange={(e) => setEditForm({ ...editForm, batch_no: e.target.value })} /></div>
              <div><Label>Expiry Date *</Label><Input type="date" value={editForm.expiry_date} onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })} /></div>
              <div><Label>Qty Remaining *</Label><Input type="number" value={editForm.quantity_remaining} onChange={(e) => setEditForm({ ...editForm, quantity_remaining: Number(e.target.value) })} /></div>
              <div><Label>Cost Price *</Label><Input type="number" value={editForm.cost_price} onChange={(e) => setEditForm({ ...editForm, cost_price: Number(e.target.value) })} /></div>
              <div><Label>Selling Price *</Label><Input type="number" value={editForm.selling_price} onChange={(e) => setEditForm({ ...editForm, selling_price: Number(e.target.value) })} /></div>
              <div>
                <Label>Dealer</Label>
                <select className="flex h-10 w-full rounded-lg border px-3 text-sm" value={editForm.dealer_id} onChange={(e) => setEditForm({ ...editForm, dealer_id: e.target.value })}>
                  <option value="">None</option>
                  {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-4 mt-2">
                <Button variant="outline" onClick={() => setEditingBatch(null)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={isPending || !editForm.batch_no}>
                  {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Update Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Current Batches</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-left">Medicine</th>
                  <th className="px-4 py-3 text-left">Dealer</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const med = b.medicines as { name: string };
                  const dealer = b.dealers as { name: string } | null;
                  return (
                    <tr key={b.id} className={`border-b ${expiryRowClass(b.expiry_date)}`}>
                      <td className="px-4 py-3 font-mono">{b.batch_no}</td>
                      <td className="px-4 py-3">{med?.name}</td>
                      <td className="px-4 py-3">{dealer?.name ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(b.expiry_date)}</td>
                      <td className="px-4 py-3 text-right font-medium">{b.quantity_remaining}</td>
                      <td className="px-4 py-3"><ExpiryBadge expiryDate={b.expiry_date} /></td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(b.selling_price))}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(b)} disabled={!isVerified}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id, b.batch_no)} disabled={!isVerified}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!batches.length && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No stock batches available.
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
