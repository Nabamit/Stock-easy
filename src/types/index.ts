export type UserRole = "central_admin" | "shop_owner" | "shop_staff";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shop_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
  owner_name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  drug_license_no: string | null;
  pan_no: string | null;
  gst_no: string | null;
  drug_license_url: string | null;
  pan_url: string | null;
  gst_url: string | null;
  shop_photo_url: string | null;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dealer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_no: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medicine {
  id: string;
  shop_id: string;
  name: string;
  generic_name: string | null;
  manufacturer: string | null;
  category: string | null;
  unit: string;
  hsn_code: string;
  gst_rate: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  shop_id: string;
  medicine_id: string;
  dealer_id: string | null;
  batch_no: string;
  expiry_date: string;
  quantity_initial: number;
  quantity_remaining: number;
  cost_price: number;
  selling_price: number;
  mrp: number | null;
  created_at: string;
  updated_at: string;
  medicine?: Medicine;
  dealer?: Dealer;
}

export interface Bill {
  id: string;
  shop_id: string;
  bill_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  payment_mode: string;
  is_return: boolean;
  original_bill_id: string | null;
  created_by: string | null;
  created_at: string;
  doctor_name?: string | null;
  items?: BillItem[];
}

export interface BillItem {
  id: string;
  bill_id: string;
  shop_id: string;
  medicine_id: string;
  batch_id: string;
  medicine_name: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  line_total: number;
  created_at: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  shopId: string | null;
  shopVerified: boolean;
  shopName: string | null;
  shopPhotoUrl?: string | null;
  ownerName?: string | null;
}

export interface DashboardKPIs {
  totalMedicines: number;
  totalStock: number;
  stockValue: number;
  totalBatches: number;
  lowStockCount: number;
  expiringSoonCount: number;
  todaySales: number;
  monthSales: number;
  deadStockCount: number;
}

export interface ShopRegistrationInput {
  shopName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  drugLicenseNo: string;
  panNo: string;
  gstNo: string;
  drugLicenseUrl: string;
  panUrl: string;
  gstUrl: string;
  shopPhotoUrl: string;
  subscriptionPlanId: string;
}
