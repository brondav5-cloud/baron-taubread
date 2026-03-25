/**
 * GET /api/finance/check-file-hash?hash=<sha256>
 * Returns existing upload info if a file with the same hash was already uploaded.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function GET(request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  const hash = request.nextUrl.searchParams.get("hash");
  if (!hash) return NextResponse.json({ duplicate: false });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("bank_uploaded_files")
    .select("id, file_name, uploaded_at, row_count")
    .eq("company_id", companyId)
    .eq("file_hash", hash)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ duplicate: false });

  return NextResponse.json({
    duplicate: true,
    file_name: data.file_name,
    uploaded_at: data.uploaded_at,
    row_count: data.row_count,
  });
}
