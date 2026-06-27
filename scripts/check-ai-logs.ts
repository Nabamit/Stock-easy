import { getDb } from "../src/lib/supabase/server";

async function main() {
  const db = getDb();
  const { data, error } = await db
    .from("ai_query_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  console.log("Last 5 AI Query Logs:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
