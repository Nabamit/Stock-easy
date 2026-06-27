import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    console.error("Missing env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const db = createClient(url, key);
  
  const shopId = "89811c67-3280-436c-a275-8b815c165f05";
  console.log(`Updating shop with ID: ${shopId} to approved...`);

  const { data, error } = await db
    .from("shops")
    .update({
      verification_status: "approved",
      verified_at: new Date().toISOString(),
      subscription_status: "active"
    })
    .eq("id", shopId)
    .select();

  if (error) {
    console.error("Error updating shop verification status:", error);
    process.exit(1);
  }

  console.log("Shop updated successfully!", data);
}

main().catch(console.error);
