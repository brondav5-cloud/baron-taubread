import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getUser() {
  const authClient = createServerSupabaseClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  return error || !user ? null : user;
}

// POST /api/accounting/overrides
// Body: { transaction_id, override_type, new_value?, note? }
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("transaction_overrides")
    .upsert(
      { ...body, user_id: user.id },
      { onConflict: "transaction_id,override_type" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ override: data });
}

// PATCH /api/accounting/overrides
// Body: { id, new_value?, note? }
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("transaction_overrides")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ override: data });
}

// DELETE /api/accounting/overrides?id=xxx
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("transaction_overrides")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
