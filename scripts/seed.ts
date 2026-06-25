/**
 * Database seed script for Stock Easy development accounts.
 * Run: npm run db:seed
 *
 * Creates:
 * - admin@stockeasy.in / admin123 (central_admin)
 * - Test Pharmacy (approved) - owner1@test.com / owner123
 * - Pending Pharmacy (pending) - owner2@test.com / owner123
 */

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

async function hash(pw: string) {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

function validateEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    console.error("\n❌ Missing env vars in .env.local:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL");
    console.error("   SUPABASE_SERVICE_ROLE_KEY\n");
    process.exit(1);
  }

  if (url.includes("your-project") || url.includes("example")) {
    console.error("\n❌ .env.local still has PLACEHOLDER Supabase URL:");
    console.error(`   ${url}`);
    console.error("\n   Fix: Supabase Dashboard → Project Settings → API → copy Project URL");
    console.error("   It should look like: https://abcdefghijklmnop.supabase.co\n");
    process.exit(1);
  }

  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    console.error("\n❌ Invalid Supabase URL format:", url);
    console.error("   Expected: https://<project-id>.supabase.co\n");
    process.exit(1);
  }

  if (key.length < 100 || !key.startsWith("eyJ")) {
    console.error("\n❌ .env.local still has PLACEHOLDER service role key (too short).");
    console.error(`   Current key length: ${key.length} (real keys are ~200+ chars)`);
    console.error("\n   Fix: Supabase Dashboard → Project Settings → API");
    console.error("   Copy the full service_role key (click Reveal)\n");
    process.exit(1);
  }

  return { url, key };
}

async function main() {
  const { url, key } = validateEnv();

  const db = createClient(url, key, {
    auth: { persistSession: false },
  });

  // Quick connectivity check before seeding
  const { error: pingError } = await db.from("users").select("id").limit(1);
  if (pingError?.message?.includes("fetch failed") || pingError?.details?.includes("fetch")) {
    console.error("\n❌ Cannot reach Supabase. Check:");
    console.error("   1. Project URL is correct and project is Active (not paused)");
    console.error("   2. Internet / firewall is not blocking supabase.co");
    console.error(`   3. URL in use: ${url}\n`);
    process.exit(1);
  }
  if (pingError?.code === "42P01") {
    console.error("\n❌ Tables not found. Run the migration first:");
    console.error("   supabase/migrations/001_initial_schema.sql in Supabase SQL Editor\n");
    process.exit(1);
  }

  console.log("Seeding Stock Easy database...\n");
  console.log(`Connected to: ${new URL(url).host}\n`);

  // --- Central Admin ---
  const adminHash = await hash("admin123");
  const { data: existingAdmin } = await db
    .from("users")
    .select("id")
    .eq("email", "admin@stockeasy.in")
    .maybeSingle();

  if (!existingAdmin) {
    const { error } = await db.from("users").insert({
      email: "admin@stockeasy.in",
      password_hash: adminHash,
      name: "Platform Admin",
      role: "central_admin",
      shop_id: null,
    });
    if (error) console.error("Admin seed error:", error.message);
    else console.log("✓ Admin: admin@stockeasy.in / admin123");
  } else {
    console.log("• Admin already exists, skipping");
  }

  // --- Verified Shop: Test Pharmacy ---
  const { data: existingShop1 } = await db
    .from("shops")
    .select("id")
    .eq("name", "Test Pharmacy")
    .maybeSingle();

  if (!existingShop1) {
    const owner1Hash = await hash("owner123");

    const { data: shop1, error: shop1Err } = await db
      .from("shops")
      .insert({
        name: "Test Pharmacy",
        owner_name: "Rajesh Kumar",
        phone: "9876543210",
        address: "12 MG Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        drug_license_no: "DL-MH-2020-12345",
        pan_no: "ABCDE1234F",
        gst_no: "27ABCDE1234F1Z5",
        drug_license_url: "https://placeholder.stockeasy.in/docs/dl-test.pdf",
        pan_url: "https://placeholder.stockeasy.in/docs/pan-test.pdf",
        gst_url: "https://placeholder.stockeasy.in/docs/gst-test.pdf",
        shop_photo_url: "https://placeholder.stockeasy.in/photos/test-pharmacy.jpg",
        verification_status: "approved",
        verified_at: new Date().toISOString(),
        subscription_status: "active",
      })
      .select("id")
      .single();

    if (shop1Err || !shop1) {
      console.error("Shop1 seed error:", shop1Err?.message);
    } else {
      const { data: user1, error: user1Err } = await db
        .from("users")
        .insert({
          email: "owner1@test.com",
          password_hash: owner1Hash,
          name: "Rajesh Kumar",
          role: "shop_owner",
          shop_id: shop1.id,
        })
        .select("id")
        .single();

      if (user1Err) {
        console.error("Owner1 seed error:", user1Err.message);
      } else if (user1) {
        await db
          .from("shops")
          .update({ owner_user_id: user1.id, verified_by: user1.id })
          .eq("id", shop1.id);

        await db.from("discount_clusters").insert([
          { shop_id: shop1.id, name: "Cluster A (15%)", discount_percent: 15 },
          { shop_id: shop1.id, name: "Cluster B (20%)", discount_percent: 20 },
          { shop_id: shop1.id, name: "Cluster C (25%)", discount_percent: 25 },
        ]);

        // Seed sample medicines and batches for demo
        const medicines = [
          { name: "Paracetamol 500mg", generic_name: "Paracetamol", category: "Analgesic", unit: "strip" },
          { name: "Amoxicillin 250mg", generic_name: "Amoxicillin", category: "Antibiotic", unit: "strip" },
          { name: "Cetirizine 10mg", generic_name: "Cetirizine", category: "Antihistamine", unit: "strip" },
          { name: "Omeprazole 20mg", generic_name: "Omeprazole", category: "Antacid", unit: "strip" },
          { name: "Metformin 500mg", generic_name: "Metformin", category: "Antidiabetic", unit: "strip" },
        ];

        for (const med of medicines) {
          const { data: medicine } = await db
            .from("medicines")
            .insert({ shop_id: shop1.id, ...med })
            .select("id")
            .single();

          if (medicine) {
            const expiryOffset = Math.floor(Math.random() * 300) + 30;
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + expiryOffset);

            await db.from("batches").insert({
              shop_id: shop1.id,
              medicine_id: medicine.id,
              batch_no: `BATCH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
              expiry_date: expiry.toISOString().split("T")[0],
              quantity_initial: Math.floor(Math.random() * 100) + 20,
              quantity_remaining: Math.floor(Math.random() * 80) + 10,
              cost_price: Math.floor(Math.random() * 50) + 10,
              selling_price: Math.floor(Math.random() * 80) + 20,
            });
          }
        }

        console.log("✓ Verified Shop: Test Pharmacy - owner1@test.com / owner123");
      }
    }
  } else {
    console.log("• Test Pharmacy already exists, skipping");
  }

  // --- Unverified Shop: Pending Pharmacy ---
  const { data: existingShop2 } = await db
    .from("shops")
    .select("id")
    .eq("name", "Pending Pharmacy")
    .maybeSingle();

  if (!existingShop2) {
    const owner2Hash = await hash("owner123");

    const { data: shop2, error: shop2Err } = await db
      .from("shops")
      .insert({
        name: "Pending Pharmacy",
        owner_name: "Suresh Patel",
        phone: "9876543211",
        address: "45 Station Road",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        drug_license_no: "DL-MH-2021-67890",
        pan_no: "FGHIJ5678K",
        gst_no: "27FGHIJ5678K1Z6",
        drug_license_url: "https://placeholder.stockeasy.in/docs/dl-pending.pdf",
        pan_url: "https://placeholder.stockeasy.in/docs/pan-pending.pdf",
        gst_url: "https://placeholder.stockeasy.in/docs/gst-pending.pdf",
        shop_photo_url: "https://placeholder.stockeasy.in/photos/pending-pharmacy.jpg",
        verification_status: "pending",
        subscription_status: "trial",
      })
      .select("id")
      .single();

    if (shop2Err || !shop2) {
      console.error("Shop2 seed error:", shop2Err?.message);
    } else {
      const { data: user2, error: user2Err } = await db
        .from("users")
        .insert({
          email: "owner2@test.com",
          password_hash: owner2Hash,
          name: "Suresh Patel",
          role: "shop_owner",
          shop_id: shop2.id,
        })
        .select("id")
        .single();

      if (user2Err) {
        console.error("Owner2 seed error:", user2Err.message);
      } else if (user2) {
        await db.from("shops").update({ owner_user_id: user2.id }).eq("id", shop2.id);
        console.log("✓ Pending Shop: Pending Pharmacy - owner2@test.com / owner123");
      }
    }
  } else {
    console.log("• Pending Pharmacy already exists, skipping");
  }

  console.log("\nSeed complete!");
}

main().catch(console.error);
