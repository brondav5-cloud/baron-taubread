import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_COOKIE_NAME } from "@/lib/supabase/env";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required" },
      { status: 400 },
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
