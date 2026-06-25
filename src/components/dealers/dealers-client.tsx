"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDealersAction, createDealerAction } from "@/lib/actions/dealers";
import { formatCurrency } from "@/lib/utils";

export function DealersClient() {
  const [dealers, setDealers] = useState<Awaited<ReturnType<typeof getDealersAction>>>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", phone: "", gst_no: "", email: "", address: "" });

  function load() {
    startTransition(async () => setDealers(await getDealersAction()));
  }

  useEffect(() => { load(); }, []);

  function handleAdd() {
    startTransition(async () => {
      const result = await createDealerAction(form);
      if (result.success) {
        toast.success("Dealer added");
        setShowForm(false);
        load();
      } else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" /> Add Dealer</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Dealer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>GST No</Label><Input value={form.gst_no} onChange={(e) => setForm({ ...form, gst_no: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Button onClick={handleAdd} disabled={isPending || !form.name}>
                {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-6">
              <h3 className="font-semibold">{d.name}</h3>
              <p className="text-sm text-muted-foreground">{d.phone ?? "—"} · GST: {d.gst_no ?? "—"}</p>
              <div className="mt-4 space-y-1 text-sm">
                <p>Supplied: <strong>{formatCurrency(d.suppliedValue)}</strong></p>
                <p className="text-destructive">Expired value: <strong>{formatCurrency(d.expiredValue)}</strong></p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
