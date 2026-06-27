import type { Bill, BillItem } from "@/types";

export interface BillPrintData {
  bill: Bill;
  items: BillItem[];
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGstin: string;
  cashierName: string;
}
