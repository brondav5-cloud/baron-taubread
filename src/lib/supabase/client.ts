import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wxkauqhlaiyxpiebmvkb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4a2F1cWhsYWl5eHBpZWJtdmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg0NzIsImV4cCI6MjA4NTc3NDQ3Mn0.qrbVO80ZUCjoc9YfVeWjB6AFgPUY5R9LtnSiQooyb-U";

let _client: SupabaseClient<any, "public", any> | null = null; // eslint-disable-line

export function createClient() {
  if (!_client) {
    _client = supabaseCreateClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

export function getSupabaseClient() {
  return createClient();
}
