"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, ShoppingCart, Trash2, Printer, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpiryBadge } from "@/components/shared/expiry-badge";
import { searchMedicinesFefoAction } from "@/lib/actions/medicines";
import { createBillAction } from "@/lib/actions/billing";
import { getBillPrintDataAction } from "@/lib/actions/bill-print";
import { BillReceiptPreview } from "@/components/billing/bill-receipt-preview";
import { printBill } from "@/lib/billing/print-bill";
import type { BillPrintData } from "@/types/bill-print";
import { formatCurrency, formatDate } from "@/lib/utils";
import { GST_CGST_RATE, GST_SGST_RATE } from "@/lib/constants";

interface FefoMedicine {
  id: string;
  name: string;
  generic_name: string | null;
  defaultDiscount: number;
  recommendedBatchId: string | null;
  batches: Array<{
    id: string;
    batch_no: string;
    expiry_date: string;
    quantity_remaining: number;
    selling_price: number;
    dealers?: { name: string } | null;
  }>;
}

interface CartItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  isRecommended: boolean;
  maxQty: number;
}

function calcLine(item: CartItem) {
  const sub = item.unitPrice * item.quantity;
  const disc = sub * (item.discountPercent / 100);
  const taxable = sub - disc;
  const cgst = taxable * (GST_CGST_RATE / 100);
  const sgst = taxable * (GST_SGST_RATE / 100);
  return { sub, disc, taxable, cgst, sgst, total: taxable + cgst + sgst };
}

export function BillingClient({ shopName, isVerified = true }: { shopName: string; isVerified?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FefoMedicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [doctorName, setDoctorName] = useState("Dr. S.K. Roy");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [printData, setPrintData] = useState<BillPrintData | null>(null);

  function handleSearch() {
    if (!query.trim()) return;
    startSearch(async () => {
      const data = await searchMedicinesFefoAction(query);
      setResults(data as FefoMedicine[]);
    });
  }

  function addToCart(med: FefoMedicine, batchId: string) {
    const batch = med.batches.find((b) => b.id === batchId);
    if (!batch) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.batchId === batchId);
      if (existing) {
        return prev.map((c) =>
          c.batchId === batchId ? { ...c, quantity: Math.min(c.quantity + 1, batch.quantity_remaining) } : c
        );
      }
      return [
        ...prev,
        {
          medicineId: med.id,
          medicineName: med.name,
          batchId: batch.id,
          batchNo: batch.batch_no,
          expiryDate: batch.expiry_date,
          quantity: 1,
          unitPrice: Number(batch.selling_price),
          discountPercent: med.defaultDiscount,
          isRecommended: batch.id === med.recommendedBatchId,
          maxQty: batch.quantity_remaining,
        },
      ];
    });
    toast.success(`${med.name} added to cart`);
  }

  function removeFromCart(batchId: string) {
    setCart((prev) => prev.filter((c) => c.batchId !== batchId));
  }

  function updateCart(batchId: string, field: "quantity" | "discountPercent", value: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.batchId === batchId) {
          if (field === "quantity") {
            const max = c.maxQty;
            if (value > max) {
              toast.error(`Cannot sell more than available stock (${max} units).`);
              return { ...c, quantity: max };
            }
          }
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  }

  const totals = cart.reduce(
    (acc, item) => {
      const l = calcLine(item);
      return {
        subtotal: acc.subtotal + l.sub,
        discount: acc.discount + l.disc,
        cgst: acc.cgst + l.cgst,
        sgst: acc.sgst + l.sgst,
        total: acc.total + l.total,
      };
    },
    { subtotal: 0, discount: 0, cgst: 0, sgst: 0, total: 0 }
  );

  function handleGenerateBill() {
    if (!cart.length) return toast.error("Cart is empty");
    startSave(async () => {
      const result = await createBillAction({
        customerName,
        customerPhone,
        doctorName,
        paymentMode,
        items: cart.map((c) => ({
          medicineId: c.medicineId,
          batchId: c.batchId,
          quantity: c.quantity,
          discountPercent: c.discountPercent,
        })),
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to create bill");
        return;
      }
      toast.success(`Bill ${result.billNo} created`);
      const bill = await getBillPrintDataAction(result.billId!);
      setPrintData(bill);
      setCart([]);
      setResults([]);
      setQuery("");
      setCustomerName("");
      setCustomerPhone("");
      setDoctorName("Dr. S.K. Roy");
      setPaymentMode("cash");
    });
  }

  function handlePrint() {
    if (!printData) return;
    printBill(printData);
  }

  return (
    <div className="space-y-6 relative min-h-[400px]">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search Medicine (FEFO)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or generic..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto">
              {results.map((med) => (
                <div key={med.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{med.name}</p>
                      <p className="text-xs text-muted-foreground">{med.generic_name}</p>
                      {med.defaultDiscount > 0 && (
                        <Badge variant="secondary" className="mt-1">
                          Cluster discount: {med.defaultDiscount}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {med.batches.map((b) => (
                      <div
                        key={b.id}
                        className={`flex items-center justify-between rounded-md border p-2 text-sm ${
                          b.id === med.recommendedBatchId ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                        }`}
                      >
                        <div>
                          <span className="font-mono text-xs">{b.batch_no}</span>
                          <span className="mx-2 text-muted-foreground">·</span>
                          <span>Exp: {formatDate(b.expiry_date)}</span>
                          <ExpiryBadge expiryDate={b.expiry_date} />
                          {b.id === med.recommendedBatchId && (
                            <Badge className="ml-2" variant="default">FEFO Recommended</Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Qty: {b.quantity_remaining} · {formatCurrency(Number(b.selling_price))}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => addToCart(med, b.id)}>Add</Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" /> Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Search and add medicines</p>
            ) : (
              cart.map((item) => (
                <div key={item.batchId} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.medicineName}</p>
                      <p className="text-xs text-muted-foreground">
                        Batch {item.batchNo} · Exp {formatDate(item.expiryDate)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.batchId)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateCart(item.batchId, "quantity", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Discount %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discountPercent}
                        onChange={(e) => updateCart(item.batchId, "discountPercent", Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="font-semibold">{formatCurrency(calcLine(item).total)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label>Customer Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <Label>Doctor Name</Label>
                <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Payment Mode</Label>
              <select
                className="flex h-10 w-full rounded-lg border px-3 text-sm"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div>
              <div className="flex justify-between"><span>CGST ({GST_CGST_RATE}%)</span><span>{formatCurrency(totals.cgst)}</span></div>
              <div className="flex justify-between"><span>SGST ({GST_SGST_RATE}%)</span><span>{formatCurrency(totals.sgst)}</span></div>
              <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
            </div>

            <Button 
              className="w-full gap-2 font-semibold shadow-lg shadow-primary/25" 
              onClick={() => {
                if (!isVerified) {
                  toast.error("Billing is locked in Trial Mode. Please upgrade/renew your subscription or wait for Admin verification to activate.");
                  return;
                }
                handleGenerateBill();
              }} 
              disabled={isSaving || (!isVerified ? false : !cart.length)}
            >
              {!isVerified && <Lock className="h-4 w-4" />}
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (!isVerified ? "Generate Bill (Locked)" : "Generate Bill")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {printData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Bill {printData.bill.bill_no}</CardTitle>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-1 h-4 w-4" /> Print Bill
            </Button>
          </CardHeader>
          <CardContent>
            <BillReceiptPreview data={printData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
