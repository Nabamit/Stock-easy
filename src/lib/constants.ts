export const APP_NAME = "Stock Easy";
export const APP_TAGLINE = "Smart Medicine Stock Management for Indian Pharmacies";

export const GST_CGST_RATE = 2.5;
export const GST_SGST_RATE = 2.5;

export const SESSION_COOKIE = "stockeasy_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const EXPIRY_WARNING_DAYS = 90;
export const EXPIRY_CRITICAL_DAYS = 30;
export const DEAD_STOCK_DAYS = 180;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  adminLogin: "/admin/login",
  shopDashboard: "/dashboard",
  shopPending: "/pending",
  adminDashboard: "/admin/dashboard",
  adminVerification: "/admin/verification",
  adminShops: "/admin/shops",
} as const;
