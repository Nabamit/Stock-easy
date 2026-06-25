"use server";

import { requireVerifiedShopSession } from "@/lib/auth/actions";

export async function getShopContext() {
  const session = await requireVerifiedShopSession();
  if (!session.shopId) throw new Error("Shop not found");
  return {
    shopId: session.shopId,
    userId: session.userId,
    shopName: session.shopName ?? "Pharmacy",
    session,
  };
}
