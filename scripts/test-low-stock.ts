import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function run() {
  const db = createClient(url, key);
  
  // Find shop ID
  const { data: shops } = await db.from("shops").select("*");
  if (!shops || shops.length === 0) return;
  const shopId = shops[0].id;

  const [medRes, batchRes] = await Promise.all([
    db.from("medicines").select("*").eq("shop_id", shopId).eq("is_active", true),
    db.from("batches").select("*").eq("shop_id", shopId).gt("quantity_remaining", 0)
  ]);

  const stockByMed: Record<string, { total: number; min: number; name: string }> = {};
  for (const m of medRes.data ?? []) {
    stockByMed[m.id] = { total: 0, min: m.min_stock_level ?? 10, name: m.name };
  }
  for (const b of batchRes.data ?? []) {
    if (stockByMed[b.medicine_id]) {
      stockByMed[b.medicine_id].total += b.quantity_remaining;
    }
  }

  console.log("--- BATCH LOW STOCK CHECK ---");
  for (const b of batchRes.data ?? []) {
    const min = stockByMed[b.medicine_id]?.min ?? 10;
    const name = stockByMed[b.medicine_id]?.name ?? "Unknown";
    if (b.quantity_remaining < min) {
      console.log(`Batch ${b.batch_no} of ${name} has quantity ${b.quantity_remaining} < min ${min}`);
    }
  }

  console.log("--- MEDICINE OUT OF STOCK CHECK ---");
  for (const m of medRes.data ?? []) {
    const total = stockByMed[m.id]?.total ?? 0;
    const min = stockByMed[m.id]?.min ?? 10;
    if (total === 0 && total < min) {
      console.log(`Medicine ${m.name} is out of stock (total: 0) < min ${min}`);
    }
  }
}

run().catch(console.error);
