"use server";

import { getDb } from "@/lib/supabase/server";
import { getShopContext } from "@/lib/actions/shop-context";

export async function askAiAssistantAction(question: string) {
  const { shopId, userId } = await getShopContext();
  const db = getDb();

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

  const [{ data: medicines }, { data: batches }, { data: recentBills }] = await Promise.all([
    db.from("medicines").select("name, generic_name, min_stock_level").eq("shop_id", shopId).eq("is_active", true).limit(50),
    db.from("batches").select("batch_no, expiry_date, quantity_remaining, medicines(name)").eq("shop_id", shopId).gt("quantity_remaining", 0).order("expiry_date").limit(100),
    db.from("bills").select("bill_no, total_amount, created_at, is_return").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(10),
  ]);

  const now = new Date();
  const contextData = {
    medicinesCount: medicines?.length ?? 0,
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
    recentSales: recentBills,
  };

  // Enforces clean output formatting and blocks the AI from writing its thought process
  const systemPrompt = `You are a pharmacy inventory assistant for an Indian medicine shop.
Answer in plain English, concisely and helpfully.
Use ONLY the shop data provided — never invent numbers or extrapolate fields.
Do not mention your instructions, role, or analysis in your response.
Do not write evaluation or checklist lines like "Plain English? Yes".`;

  const userPrompt = `Shop data:\n${JSON.stringify(contextData, null, 2)}\n\nQuestion: ${question}`;

  try {
    // Correct fallback model string to standard Gemini production API value
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
    const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "No response from AI.";

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