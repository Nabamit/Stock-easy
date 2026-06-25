"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Search, Printer, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBillsHistoryAction, processReturnAction } from "@/lib/actions/bills";
import { getBillPrintDataAction } from "@/lib/actions/bill-print";
import { BillReceiptPreview } from "@/components/billing/bill-receipt-preview";
import { printBill } from "@/lib/billing/print-bill";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BillPrintData } from "@/types/bill-print";

export function BillsClient() {
  const [search, setSearch] = useState("");
  const [bills, setBills] = useState<Awaited<ReturnType<typeof getBillsHistoryAction>>>([]);
  const [printData, setPrintData] = useState<BillPrintData | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();

  function load(q?: string) {
    startTransition(async () => setBills(await getBillsHistoryAction(q)));
  }

  useEffect(() => { load(); }, []);

  function viewBill(id: string) {
    startTransition(async () => {
      const data = await getBillPrintDataAction(id);
      setPrintData(data);
      setReturnQtys({});
    });
  }

  function handleReturn() {
    if (!printData?.bill || printData.bill.is_return) return;
    const items = Object.entries(returnQtys)
      .filter(([, q]) => q > 0)
      .map(([billItemId, quantity]) => ({ billItemId, quantity }));
    if (!items.length) return toast.error("Select quantities to return");

    startTransition(async () => {
      const result = await processReturnAction(printData.bill.id, items);
      if (result.success) {
        toast.success("Return processed");
        if (result.returnBillId) {
          const returnBill = await getBillPrintDataAction(result.returnBillId);
          setPrintData(returnBill);
        } else {
          setPrintData(null);
        }
        load(search);
      } else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input placeholder="Search by bill no or customer..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(search)} />
        <Button variant="outline" onClick={() => load(search)}><Search className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Bill History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bills.map((b) => (
              <div
                key={b.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-muted/50 ${printData?.bill.id === b.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => viewBill(b.id)}
              >
                <div>
                  <p className="font-medium">{b.bill_no}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(b.created_at)} · {b.customer_name ?? "Walk-in"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(Number(b.total_amount))}</p>
                  {b.is_return && <Badge variant="warning">Return</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {printData && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{printData.bill.bill_no}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => printBill(printData)}>
                <Printer className="mr-1 h-4 w-4" /> Print Bill
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <BillReceiptPreview data={printData} />

              {!printData.bill.is_return && printData.items.map((item) => (
                <div key={item.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{item.medicine_name} × {item.quantity}</p>
                  <p className="text-xs text-muted-foreground">Batch {item.batch_no}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Label className="text-xs">Return qty:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity}
                      className="h-8 w-20"
                      value={returnQtys[item.id] ?? 0}
                      onChange={(e) => setReturnQtys({ ...returnQtys, [item.id]: Number(e.target.value) })}
                    />
                  </div>
                </div>
              ))}

              {!printData.bill.is_return && (
                <Button variant="destructive" onClick={handleReturn} disabled={isPending} className="gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Process Return
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
