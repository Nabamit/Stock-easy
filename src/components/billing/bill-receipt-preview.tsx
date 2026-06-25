"use client";

import type { BillPrintData } from "@/types/bill-print";
import { formatCurrency, formatDate } from "@/lib/utils";

export function BillReceiptPreview({ data }: { data: BillPrintData }) {
  const { bill, items, shopName, shopAddress, shopGstin, cashierName } = data;
  const isReturn = bill.is_return;

  return (
    <div className="relative mx-auto max-w-md overflow-hidden rounded-lg border bg-white p-6 text-sm shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="-rotate-[35deg] select-none text-5xl font-bold text-black/[0.06]">
          {shopName}
        </span>
      </div>
      <div className="relative z-10 space-y-3">
        <div className="text-center">
          <h3 className="text-xl font-bold">{shopName}</h3>
          {shopAddress && <p className="text-xs text-muted-foreground">{shopAddress}</p>}
          {shopGstin && <p className="text-xs text-muted-foreground">GSTIN: {shopGstin}</p>}
          <p className="mt-2 text-sm font-bold tracking-wide text-emerald-700">
            {isReturn ? "RETURN INVOICE" : "TAX INVOICE"}
          </p>
        </div>
        <div className="space-y-0.5 text-xs">
          <p><span className="font-semibold">Bill:</span> {bill.bill_no}</p>
          <p><span className="font-semibold">Date:</span> {formatDate(bill.created_at)}</p>
          <p><span className="font-semibold">Customer:</span> {bill.customer_name ?? "Walk-in"}</p>
          <p><span className="font-semibold">Cashier:</span> {cashierName}</p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dashed">
              <th className="py-2 text-left font-semibold">Item</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-dashed border-gray-200">
                <td className="py-2">
                  <div className="font-medium">{i.medicine_name}</div>
                  <div className="text-muted-foreground">Batch: {i.batch_no}</div>
                </td>
                <td className="py-2 text-right">{i.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(Number(i.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(bill.subtotal))}</span></div>
          <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(Number(bill.cgst_amount))}</span></div>
          <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(Number(bill.sgst_amount))}</span></div>
          <div className="flex justify-between border-t border-dashed pt-2 text-sm font-bold">
            <span>Total</span>
            <span>{isReturn ? "-" : ""}{formatCurrency(Math.abs(Number(bill.total_amount)))}</span>
          </div>
        </div>
        <p className="border-t border-dashed pt-3 text-center text-[11px] text-muted-foreground">
          Thank you! Get well soon. — {shopName}
        </p>
      </div>
    </div>
  );
}
