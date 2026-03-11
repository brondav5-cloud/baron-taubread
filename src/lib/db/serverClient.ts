import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_COOKIE_NAME } from "@/lib/supabase/env";

/**
 * Creates a Supabase client for server-side use with cookie-based session.
 * Uses @supabase/ssr (App Router). Does NOT use service role key.
 */
export function createServerDBClient(_request: NextRequest) {
  const cookieStore = cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        name: AUTH_COOKIE_NAME,
        path: "/",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
