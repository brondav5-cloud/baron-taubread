/**
 * GET /api/finance/uploaded-files
 * Returns bank uploaded files for the company, newest first.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

export async function GET(_request: NextRequest) {
  const supabaseAuth = createServerSupabaseClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "לא מורשה" }, { status: 401 });

  const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("bank_uploaded_files")
    .select("id, file_name, file_format, date_from, date_to, row_count, uploaded_at, bank_account_id")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ files: data ?? [] });
}
