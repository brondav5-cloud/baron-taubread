import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getUser() {
  const authClient = createServerSupabaseClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  return error || !user ? null : user;
}

// GET /api/accounting/tags
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const [tagsRes, accountTagsRes] = await Promise.all([
    supabase.from("custom_tags").select("*").eq("user_id", user.id),
    supabase.from("account_tags").select("account_id, tag_id"),
  ]);

  return NextResponse.json({
    tags: tagsRes.data ?? [],
    accountTags: accountTagsRes.data ?? [],
  });
}

// POST /api/accounting/tags — create tag or assign account→tag
// Body: { mode: 'tag', name, color, icon? } OR { mode: 'assign', account_id, tag_id }
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (body.mode === "assign") {
    const { data, error } = await supabase
      .from("account_tags")
      .upsert({ account_id: body.account_id, tag_id: body.tag_id }, { onConflict: "account_id,tag_id", ignoreDuplicates: true })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  }

  // Create new tag
  const { data, error } = await supabase
    .from("custom_tags")
    .insert({ name: body.name, color: body.color, icon: body.icon, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data });
}

// PATCH /api/accounting/tags — update tag
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...update } = body;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("custom_tags")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tag: data });
}

// DELETE /api/accounting/tags?id=xxx or ?account_id=xxx&tag_id=xxx
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const accountId = searchParams.get("account_id");
  const tagId = searchParams.get("tag_id");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (accountId && tagId) {
    // Remove account→tag assignment
    const { error } = await supabase
      .from("account_tags")
      .delete()
      .eq("account_id", accountId)
      .eq("tag_id", tagId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (id) {
    const { error } = await supabase
      .from("custom_tags")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Missing id or account_id+tag_id" }, { status: 400 });
}
