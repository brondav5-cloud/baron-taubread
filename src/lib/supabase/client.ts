import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  console.log("[DIAG2] URL:", JSON.stringify(url), "KEY len:", key?.length);
  return createBrowserClient(url, key);
}

export function getSupabaseClient() {
  return createClient();
}
