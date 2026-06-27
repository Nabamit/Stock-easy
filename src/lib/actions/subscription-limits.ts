"use server";

import { getDb } from "@/lib/supabase/server";

export interface SubscriptionLimits {
  planName: "Starter" | "Professional" | "Enterprise";
  dailyBillingLimit: number;
  billHistoryLimit: number;
  medicineSkuLimit: number;
  monthlyStockEntriesLimit: number;
  dealersLimit: number;
  staffLimit: number;
  analyticsUnlocked: boolean;
  aiAssistantLimit: number;
}

export async function getShopSubscriptionLimit(shopId: string): Promise<SubscriptionLimits> {
  const db = getDb();
  
  // Fetch shop along with its subscription plan details
  const { data: shop } = await db
    .from("shops")
    .select("*, subscription_plans(name)")
    .eq("id", shopId)
    .single();

  const planName = (shop?.subscription_plans as any)?.name || "Starter";

  if (planName === "Enterprise") {
    return {
      planName: "Enterprise",
      dailyBillingLimit: Infinity,
      billHistoryLimit: Infinity,
      medicineSkuLimit: Infinity,
      monthlyStockEntriesLimit: Infinity,
      dealersLimit: Infinity,
      staffLimit: Infinity,
      analyticsUnlocked: true,
      aiAssistantLimit: Infinity,
    };
  } else if (planName === "Professional") {
    return {
      planName: "Professional",
      dailyBillingLimit: 100,
      billHistoryLimit: 3000,
      medicineSkuLimit: 1000,
      monthlyStockEntriesLimit: 1500,
      dealersLimit: 7,
      staffLimit: 5,
      analyticsUnlocked: true,
      aiAssistantLimit: 10,
    };
  } else {
    // Default to Starter limits
    return {
      planName: "Starter",
      dailyBillingLimit: 30,
      billHistoryLimit: 1000,
      medicineSkuLimit: 100,
      monthlyStockEntriesLimit: 100,
      dealersLimit: 3,
      staffLimit: 1,
      analyticsUnlocked: false,
      aiAssistantLimit: 0,
    };
  }
}
