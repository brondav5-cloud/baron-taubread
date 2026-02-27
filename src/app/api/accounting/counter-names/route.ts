import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getUser() {
  const authClient = createServerSupabaseClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  return error || !user ? null : user;
}

// GET /api/accounting/counter-names
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("counter_account_names")
    .select("*")
    .eq("user_id", user.id)
    .order("counter_account_code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterNames: data });
}

// POST /api/accounting/counter-names
// Body: { counter_account_code, display_name }
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("counter_account_names")
    .upsert(
      { ...body, user_id: user.id },
      { onConflict: "user_id,counter_account_code" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterName: data });
}

// PATCH /api/accounting/counter-names
// Body: { id, display_name }
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...update } = body;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("counter_account_names")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterName: data });
}
