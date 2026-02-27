import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";

export function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
