"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Edit, Trash2, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getDealersAction, 
  createDealerAction,
  updateDealerAction,
  deleteDealerAction
} from "@/lib/actions/dealers";
import { formatCurrency } from "@/lib/utils";

type DealerType = Awaited<ReturnType<typeof getDealersAction>>[number];

export function DealersClient({ isVerified = true }: { isVerified?: boolean }) {
  const [dealers, setDealers] = useState<DealerType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDealer, setEditingDealer] = useState<DealerType | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState({ name: "", phone: "", gst_no: "", email: "", address: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", gst_no: "", email: "", address: "" });

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
        setForm({ name: "", phone: "", gst_no: "", email: "", address: "" });
        load();
      } else toast.error(result.error);
    });
  }

  function handleUpdate() {
    if (!editingDealer) return;
    startTransition(async () => {
      const result = await updateDealerAction(editingDealer.id, editForm);
      if (result.success) {
        toast.success("Dealer updated successfully");
        setEditingDealer(null);
        load();
      } else toast.error(result.error);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete dealer: ${name}?`)) return;
    startTransition(async () => {
      const result = await deleteDealerAction(id);
      if (result.success) {
        toast.success("Dealer deleted successfully");
        load();
      } else toast.error(result.error);
    });
  }

  function openEdit(d: DealerType) {
    setEditingDealer(d);
    setEditForm({
      name: d.name || "",
      phone: d.phone || "",
      gst_no: d.gst_no || "",
      email: d.email || "",
      address: d.address || "",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          onClick={() => isVerified && setShowForm(!showForm)} 
          disabled={!isVerified}
          className={!isVerified ? "opacity-75 cursor-not-allowed" : ""}
        >
          {isVerified ? <Plus className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />} Add Dealer {!isVerified && "(Locked)"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">New Dealer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>GST No</Label><Input value={form.gst_no} onChange={(e) => setForm({ ...form, gst_no: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Button onClick={handleAdd} disabled={isPending || !form.name}>
                {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save Dealer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editing Dialog Modal */}
      {editingDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
          <Card className="w-full max-w-lg border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4">
              <CardTitle className="text-base">Edit Dealer Details</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingDealer(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div><Label>Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div><Label>GST No</Label><Input value={editForm.gst_no} onChange={(e) => setEditForm({ ...editForm, gst_no: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Address</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
              <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-4 mt-2">
                <Button variant="outline" onClick={() => setEditingDealer(null)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={isPending || !editForm.name}>
                  {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Update Dealer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.map((d) => (
          <Card key={d.id} className="relative hover:border-primary transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-base text-foreground">{d.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.phone ?? "—"} · GST: {d.gst_no ?? "—"}</p>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEdit(d)} disabled={!isVerified}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.id, d.name)} disabled={!isVerified}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-xs border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplied Value:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(d.suppliedValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expired Value:</span>
                  <span className="font-semibold text-destructive">{formatCurrency(d.expiredValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!dealers.length && (
          <p className="col-span-full py-12 text-center text-muted-foreground">No dealers registered yet.</p>
        )}
      </div>
    </div>
  );
}
