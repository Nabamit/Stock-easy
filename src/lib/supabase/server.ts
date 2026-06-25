import { createClient, SupabaseClient } from "@supabase/supabase-js";
/**
 * Service-role Supabase client for server-side operations.
 * RLS context is set per-request via setRlsContext().
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Execute a callback with RLS context set on the connection.
 * Uses Supabase service role with explicit shop_id filtering in queries.
 */
export function getDb() {
  return createServiceClient();
}
