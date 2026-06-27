import type { BillPrintData } from "@/types/bill-print";

function formatInr(amount: number): string {
  const abs = Math.abs(amount);
  return `₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatBillDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/** Build printable HTML — always includes pharmacy watermark (matches tax invoice layout). */
export function buildBillPrintHtml(data: BillPrintData): string {
  const { bill, items, shopName, shopAddress, shopPhone, shopGstin, cashierName } = data;
  const isReturn = bill.is_return;
  const title = isReturn ? "RETURN INVOICE" : "TAX INVOICE";

  const consolidated = items.reduce((acc, current) => {
    const existing = acc.find((x) => x.medicine_name === current.medicine_name);
    if (existing) {
      existing.quantity += current.quantity;
      existing.line_total = Number(existing.line_total) + Number(current.line_total);
    } else {
      acc.push({
        ...current,
        line_total: Number(current.line_total)
      });
    }
    return acc;
  }, [] as Array<typeof items[number] & { line_total: number }>);

  const rows = consolidated
    .map(
      (i) => `
      <tr>
        <td>
          <div class="item-name">${i.medicine_name}</div>
        </td>
        <td class="num">${i.quantity}</td>
        <td class="num">${formatInr(i.line_total)}</td>
      </tr>`
    )
    .join("");

  const subtotal = Number(bill.subtotal);
  const discount = Number(bill.discount_amount);
  const cgst = Number(bill.cgst_amount);
  const sgst = Number(bill.sgst_amount);
  const total = Number(bill.total_amount);

  const discountRow = discount > 0 
    ? `<div class="row" style="color: #dc2626; font-weight: 500;"><span>Discount</span><span>-${formatInr(discount)}</span></div>` 
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${bill.bill_no}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #111;
      padding: 24px;
      max-width: 420px;
      margin: 0 auto;
      position: relative;
    }
    .watermark {
      position: fixed;
      top: 38%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 52px;
      font-weight: bold;
      color: rgba(0, 0, 0, 0.06);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }
    .content { position: relative; z-index: 1; }
    .shop-name { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 4px; }
    .shop-meta { text-align: center; font-size: 12px; color: #444; line-height: 1.5; margin-bottom: 8px; }
    .invoice-title {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      color: #15803d;
      letter-spacing: 0.5px;
      margin: 10px 0 14px;
    }
    .meta { font-size: 12px; line-height: 1.7; margin-bottom: 12px; }
    .meta strong { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 12px; }
    th {
      text-align: left;
      border-bottom: 1px dashed #999;
      padding: 6px 4px;
      font-weight: 600;
    }
    th.num, td.num { text-align: right; }
    td { padding: 8px 4px; border-bottom: 1px dashed #ddd; vertical-align: top; }
    .item-name { font-weight: 500; }
    .item-batch { font-size: 11px; color: #666; margin-top: 2px; }
    .totals { font-size: 12px; line-height: 1.8; margin-top: 8px; }
    .totals .row { display: flex; justify-content: space-between; }
    .totals .total-row {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 14px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #999;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px dashed #ccc;
    }
    @media print {
      body { padding: 12px; }
      @page { margin: 10mm; size: auto; }
    }
  </style>
</head>
<body>
  <div class="watermark">${shopName}</div>
  <div class="content">
    <div class="shop-name">${shopName}</div>
    <div class="shop-meta">
      ${shopAddress ? `${shopAddress}<br/>` : ""}
      ${shopPhone ? `Phone: ${shopPhone}<br/>` : ""}
      ${shopGstin ? `GSTIN: ${shopGstin}` : ""}
    </div>
    <div class="invoice-title">${title}</div>
    <div class="meta">
      <div><strong>Bill:</strong> ${bill.bill_no}</div>
      <div><strong>Date:</strong> ${formatBillDate(bill.created_at)}</div>
      <div><strong>Doctor:</strong> ${bill.doctor_name ?? "Self"}</div>
      <div><strong>Customer:</strong> ${bill.customer_name ?? "Walk-in"}</div>
      ${bill.customer_phone ? `<div><strong>Cust. Phone:</strong> ${bill.customer_phone}</div>` : ""}
      <div><strong>Cashier:</strong> ${cashierName}</div>
      ${isReturn ? `<div><strong>Type:</strong> Return / Credit Note</div>` : ""}
    </div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Amt</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${formatInr(subtotal)}</span></div>
      ${discountRow}
      <div class="row"><span>CGST (2.5%)</span><span>${formatInr(cgst)}</span></div>
      <div class="row"><span>SGST (2.5%)</span><span>${formatInr(sgst)}</span></div>
      <div class="total-row"><span>Total</span><span>${isReturn ? "-" : ""}${formatInr(total)}</span></div>
    </div>
    <div class="footer">Thank you! Get well soon. — ${shopName}</div>
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;
}

/** Open print dialog with watermarked bill (single print option for all bills). */
export function printBill(data: BillPrintData): void {
  const html = buildBillPrintHtml(data);
  const win = window.open("", "_blank", "width=480,height=720");
  if (!win) {
    alert("Please allow pop-ups to print the bill.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
