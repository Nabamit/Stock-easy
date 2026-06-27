import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

async function run() {
  const hash = "$2b$12$nNiDxRtFpxPuEjTX1WxHjuRzqIRDrFRBJzVMGhvbRqxl0iDcrsDIC";
  const password = "Nabamit@14";
  const match = await bcrypt.compare(password, hash);
  console.log("Does the password match the hash?", match);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const db = createClient(url, key);

  const { data: user } = await db
    .from("users")
    .select("*")
    .eq("email", "nabamitcc9@gmail.com")
    .single();

  console.log("User in Supabase DB:", user);

  if (user && user.shop_id) {
    const { data: shop } = await db
      .from("shops")
      .select("*")
      .eq("id", user.shop_id)
      .single();
    console.log("Shop in Supabase DB:", shop);
  }
}

run().catch(console.error);
