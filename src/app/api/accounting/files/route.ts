import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/accounting/files — list all uploaded files for the current user
export async function GET() {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("user_id", user.id)
      .order("year", { ascending: false })
      .order("uploaded_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ files: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/accounting/files?id=xxx — delete a file and its transactions (cascade)
export async function DELETE(request: Request) {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
