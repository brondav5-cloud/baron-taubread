import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxkauqhlaiyxpiebmvkb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg0NzIsImV4cCI6MjA4NTc3NDQ3Mn0.qrbVO80ZUCjoc9YfVeWjB6AFgPUY5R9LtnSiQooyb-U";

let clientInstance: SupabaseClient | null = null;

/**
 * Singleton browser client using @supabase/supabase-js directly.
 * Bypasses @supabase/ssr's createBrowserClient which fails on Vercel
 * with "supabaseUrl is required" despite receiving valid arguments.
 */
export function createClient(): SupabaseClient {
  if (!clientInstance) {
    console.log("[DIAG] createClient called — URL:", JSON.stringify(SUPABASE_URL), "KEY length:", SUPABASE_ANON_KEY?.length);
    clientInstance = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }
  return clientInstance;
}

export function getSupabaseClient(): SupabaseClient {
  return createClient();
}
