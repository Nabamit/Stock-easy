import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function checkStock() {
  const db = createClient(url, key);

  const { data: shops } = await db.from("shops").select("*");
  if (!shops || shops.length === 0) return;
  
  for (const shop of shops) {
    console.log(`\n=================== Shop: ${shop.name} (${shop.id}) ===================`);
    
    const { data: medicines } = await db
      .from("medicines")
      .select("*")
      .eq("shop_id", shop.id)
      .eq("is_active", true);

    const { data: batches } = await db
      .from("batches")
      .select("*, medicines(name)")
      .eq("shop_id", shop.id)
      .gt("quantity_remaining", 0);
    
    console.log("All Batches with quantity_remaining > 0:");
    for (const b of batches ?? []) {
      const name = (b.medicines as any)?.name ?? "";
      console.log(`- Batch: ${b.batch_no}, Medicine: ${name}, Qty: ${b.quantity_remaining}`);
    }
  }
}

checkStock().catch(console.error);
