import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function checkUser() {
  const db = createClient(url, key);
  const { data: user, error: userError } = await db
    .from("users")
    .select("*")
    .eq("email", "nabamitdutta49@gmail.com")
    .maybeSingle();

  if (userError) {
    console.error("Error fetching user:", userError);
    return;
  }

  console.log("User details:", user);

  if (user && user.shop_id) {
    const { data: shop, error: shopError } = await db
      .from("shops")
      .select("*")
      .eq("id", user.shop_id)
      .maybeSingle();

    if (shopError) {
      console.error("Error fetching shop:", shopError);
      return;
    }
    console.log("Shop details:", shop);
  }
}

checkUser();
