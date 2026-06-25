"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBatchAction, getBatchesAction } from "@/lib/actions/batches";
import { getMedicinesAction } from "@/lib/actions/medicines";
import { getDealersAction } from "@/lib/actions/dealers";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExpiryBadge, expiryRowClass } from "@/components/shared/expiry-badge";

export function StockClient() {
  const [batches, setBatches] = useState<Awaited<ReturnType<typeof getBatchesAction>>["data"]>([]);
  const [medicines, setMedicines] = useState<{ id: string; name: string }[]>([]);
  const [dealers, setDealers] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
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

  function load() {
    startTransition(async () => {
      const [b, m, d] = await Promise.all([
        getBatchesAction(),
        getMedicinesAction(),
        getDealersAction(),
      ]);
      if (b.success) setBatches(b.data);
      if (m.success) setMedicines(m.data.map((x) => ({ id: x.id, name: x.name })));
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
        load();
      } else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add Stock
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
                      <td className="px-4 py-3 text-right">{b.quantity_remaining}</td>
                      <td className="px-4 py-3"><ExpiryBadge expiryDate={b.expiry_date} /></td>
                      <td className="px-4 py-3 text-right">{formatCurrency(Number(b.selling_price))}</td>
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
