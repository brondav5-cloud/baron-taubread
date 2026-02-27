import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getUser() {
  const authClient = createServerSupabaseClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  return error || !user ? null : user;
}

// GET /api/accounting/groups
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("custom_groups")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ groups: data });
}

// POST /api/accounting/groups
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("custom_groups")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data });
}

// PATCH /api/accounting/groups
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...update } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("custom_groups")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ group: data });
}

// DELETE /api/accounting/groups?id=xxx
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("custom_groups")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
