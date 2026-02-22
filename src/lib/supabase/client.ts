import { createBrowserClient } from "@supabase/ssr";

// Literal strings - zero dependency on env (fixes Vercel)
const SUPABASE_URL = "https://wxkauqhlaiyxpiebmvkb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg0NzIsImV4cCI6MjA4NTc3NDQ3Mn0.qrbVO80ZUCjoc9YfVeWjB6AFgPUY5R9LtnSiQooyb-U";

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        name: "hlaiyxpiebmvkb-auth-token",
        path: "/",
      },
    },
  );
}

// Singleton instance for client-side usage
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
