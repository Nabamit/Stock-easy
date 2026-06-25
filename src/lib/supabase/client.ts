import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (anon key).
 * Most data access goes through server actions with RLS context.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key);
}
