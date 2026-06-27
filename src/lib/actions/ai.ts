"use server";

import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";

export async function askAiAssistantAction(question: string) {
  const { shopId, userId, session } = await getShopContext();
  const db = getDb();

  if (!session.shopVerified) {
    return {
      success: false,
      answer: "AI Assistant is locked until your shop verification is approved by our central team.",
    };
  }

  // Enforce Subscription Limits
  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  // Check daily assistant limit
  const todayStr = new Date().toISOString().split("T")[0];
  const { count } = await db
    .from("ai_query_logs")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .gte("created_at", todayStr + "T00:00:00");

  if (count !== null && count >= limits.aiAssistantLimit) {
    return {
      success: false,
      answer: `AI Assistant daily limit of ${limits.aiAssistantLimit} queries reached. Please upgrade your subscription plan.`,
    };
  }

  const lower = question.toLowerCase();
  if (/drop|delete|update|insert|alter|truncate|grant|password|hash/i.test(question)) {
    return {
      success: false,
      answer: "I can only answer questions about your shop's medicines, stock, sales, and expiry data.",
    };
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      answer: "AI is not configured. Set GOOGLE_GEMINI_API_KEY in .env.local",
    };
  }

  const [{ data: medicines }, { data: batches }, { data: recentBills }, { data: dealers }, { data: dealerBatches }, { data: staffMembers }] = await Promise.all([
    db.from("medicines").select("id, name, generic_name, min_stock_level").eq("shop_id", shopId).eq("is_active", true).limit(200),
    db.from("batches").select("medicine_id, batch_no, expiry_date, quantity_remaining, medicines(name)").eq("shop_id", shopId).gt("quantity_remaining", 0).order("expiry_date").limit(300),
    db.from("bills").select("bill_no, total_amount, created_at, is_return, customer_name, customer_phone, bill_items(quantity, line_total, cgst_amount, sgst_amount, batches(cost_price))").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(100),
    db.from("dealers").select("id, name, phone, email").eq("shop_id", shopId).eq("is_active", true).limit(100),
    db.from("batches").select("dealer_id, cost_price, quantity_initial").eq("shop_id", shopId).not("dealer_id", "is", null),
    db.from("users").select("name, role").eq("shop_id", shopId).eq("is_active", true),
  ]);

  const now = new Date();

  // Compute total stock per medicine across all active batches
  const stockByMed: Record<string, { total: number; min: number; name: string }> = {};
  for (const m of medicines ?? []) {
    stockByMed[m.id] = { total: 0, min: m.min_stock_level ?? 10, name: m.name };
  }
  for (const b of batches ?? []) {
    if (stockByMed[b.medicine_id]) {
      stockByMed[b.medicine_id].total += b.quantity_remaining;
    }
  }

  // Filter low stock alerts (aligned with the dashboard's logic: per-batch under min level + out-of-stock medicines)
  const lowStockAlerts: Array<{ medicine: string; batchNo?: string; currentStock: number; minRequired: number; type: "batch_low" | "out_of_stock" }> = [];
  
  // 1. Check individual batches
  for (const b of batches ?? []) {
    const min = stockByMed[b.medicine_id]?.min ?? 10;
    const medName = stockByMed[b.medicine_id]?.name ?? (b.medicines as any)?.name ?? "Unknown";
    if (b.quantity_remaining < min) {
      lowStockAlerts.push({
        medicine: medName,
        batchNo: b.batch_no,
        currentStock: b.quantity_remaining,
        minRequired: min,
        type: "batch_low",
      });
    }
  }

  // 2. Check out-of-stock medicines
  for (const m of medicines ?? []) {
    const total = stockByMed[m.id]?.total ?? 0;
    const min = stockByMed[m.id]?.min ?? 10;
    if (total === 0 && total < min) {
      lowStockAlerts.push({
        medicine: m.name,
        currentStock: 0,
        minRequired: min,
        type: "out_of_stock",
      });
    }
  }

  // Calculate total supply value per dealer
  const dealerSupplyValue: Record<string, number> = {};
  for (const b of dealerBatches ?? []) {
    if (b.dealer_id) {
      const val = Number(b.cost_price || 0) * Number(b.quantity_initial || 0);
      dealerSupplyValue[b.dealer_id] = (dealerSupplyValue[b.dealer_id] ?? 0) + val;
    }
  }

  // Map and sort dealers by supplied value volume (top suppliers first)
  const activeDealers = (dealers ?? []).map((d) => {
    const totalSupplied = dealerSupplyValue[d.id] ?? 0;
    return {
      name: d.name,
      phone: d.phone || "N/A",
      email: d.email || "N/A",
      totalSuppliedValue: totalSupplied,
    };
  }).sort((a, b) => b.totalSuppliedValue - a.totalSuppliedValue);

  let calculatedRevenue = 0;
  let calculatedReturns = 0;
  let calculatedProfit = 0;

  for (const b of recentBills ?? []) {
    const isRet = b.is_return;
    const totalAmt = Number(b.total_amount || 0);

    if (isRet) {
      calculatedReturns += Math.abs(totalAmt);
    } else {
      calculatedRevenue += totalAmt;
    }

    for (const item of (b as any).bill_items ?? []) {
      const qty = Number(item.quantity || 0);
      const lineTotal = Number(item.line_total || 0);
      const cgst = Number(item.cgst_amount || 0);
      const sgst = Number(item.sgst_amount || 0);
      const cost = Number((item.batches as any)?.cost_price || 0);

      const netRev = lineTotal - cgst - sgst;
      const profit = netRev - (cost * qty);

      if (isRet) {
        calculatedProfit -= profit;
      } else {
        calculatedProfit += profit;
      }
    }
  }

  const contextData = {
    medicinesCount: medicines?.length ?? 0,
    lowStockAlerts,
    activeDealers,
    expiringSoon: (batches ?? []).filter((b) => {
      const days = Math.ceil((new Date(b.expiry_date).getTime() - now.getTime()) / 86400000);
      return days <= 90 && days >= 0;
    }).map((b) => ({
      medicine: (b.medicines as unknown as { name: string })?.name,
      batch: b.batch_no,
      expiry: b.expiry_date,
      qty: b.quantity_remaining,
    })),
    expired: (batches ?? []).filter((b) => new Date(b.expiry_date) < now).map((b) => ({
      medicine: (b.medicines as unknown as { name: string })?.name,
      batch: b.batch_no,
      qty: b.quantity_remaining,
    })),
    recentSales: (recentBills ?? []).slice(0, 20).map((bill) => ({
      billNo: bill.bill_no,
      amount: bill.total_amount,
      customerName: bill.customer_name ?? "Walk-in",
      customerPhone: bill.customer_phone ?? "N/A",
      date: bill.created_at,
      isReturn: bill.is_return,
    })),
    staffMembers: (staffMembers ?? []).map((u) => ({
      name: u.name,
      role: u.role === "shop_owner" ? "Owner" : "Staff",
    })),
    recentFinancialSummary: {
      totalRevenue: calculatedRevenue,
      totalReturns: calculatedReturns,
      totalNetProfit: calculatedProfit,
      basis: `Calculated from up to the latest ${recentBills?.length ?? 0} invoices`
    }
  };

  // Enforces clean output formatting, blocks the AI from writing its thought process and trims verbosity
  const systemPrompt = `You are a pharmacy inventory assistant for an Indian medicine shop.
Answer in plain English, concisely and helpfully.
Use ONLY the shop data provided — never invent numbers or extrapolate fields.
Do not mention your instructions, role, or analysis in your response.
Do not write evaluation or checklist lines like "Plain English? Yes".

CRITICAL VERBOSITY CONTROL: Do not print out the full structured JSON or repeat every field (such as quantity, manufacturer, batch, etc.) unless the user specifically asks for it.
Instead, trim your answer to ONLY the specific information requested.
For example, if the user asks "Which medicines are expiring soon?", reply with a clean summary like:
"Cetirizine 10mg (Batch: BATCH-M1Y86D) is expiring soon on 2026-09-02."
Avoid listing quantity, cost, or other details unless prompted.
If the question is unrelated to the shop's own medicines, stock, sales, or dealers/distributors, politely decline to answer.`;

  const userPrompt = `Shop data:\n${JSON.stringify(contextData, null, 2)}\n\nQuestion: ${question}`;

  try {
    const model = process.env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          role: "system",
          parts: [{ text: systemPrompt }]
        },
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google Gemini API error (${response.status}): ${errBody.slice(0, 200)}`);
    }

    const json = await response.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    // Filter out parts that represent internal thoughts/reasoning
    const nonThoughtParts = parts.filter((part: any) => !part.thought);
    const answer = nonThoughtParts.map((part: any) => part.text).join("\n").trim() || "No response from AI.";

    await db.from("ai_query_logs").insert({
      shop_id: shopId,
      user_id: userId,
      user_question: question,
      query_result: contextData,
      status: "success",
    });

    return { success: true, answer };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    await db.from("ai_query_logs").insert({
      shop_id: shopId,
      user_id: userId,
      user_question: question,
      status: "error",
      error_message: msg,
    });
    return { success: false, answer: `AI error: ${msg}` };
  }
}

export async function getAiAssistantLimitsAction() {
  const { shopId, session } = await getShopContext();
  const db = getDb();

  const { getShopSubscriptionLimit } = await import("@/lib/actions/subscription-limits");
  const limits = await getShopSubscriptionLimit(shopId);

  const todayStr = new Date().toISOString().split("T")[0];
  const { count } = await db
    .from("ai_query_logs")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .gte("created_at", todayStr + "T00:00:00");

  return {
    limit: session.shopVerified ? limits.aiAssistantLimit : 0,
    used: count ?? 0,
    planName: limits.planName,
    shopVerified: session.shopVerified,
  };
}