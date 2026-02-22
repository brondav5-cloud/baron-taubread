import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  setSelectedCompanyIdCookie,
  getSelectedCompanyIdCookie,
} from "@/lib/api/selectedCompany";

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json();
  const companyId = body?.companyId ?? body?.company_id;

  if (!companyId || typeof companyId !== "string") {
    return NextResponse.json(
      { ok: false, error: "חובה לציין companyId" },
      { status: 400 },
    );
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = userRow?.role === "super_admin";

  if (isSuperAdmin) {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .single();
    if (!company) {
      return NextResponse.json(
        { ok: false, error: "חברה לא נמצאה" },
        { status: 404 },
      );
    }
  } else {
    const { data: membership } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "אין הרשאה לחברה זו" },
        { status: 403 },
      );
    }
  }

  setSelectedCompanyIdCookie(companyId);

  return NextResponse.json({
    ok: true,
    companyId,
  });
}

export async function GET() {
  const companyId = getSelectedCompanyIdCookie();
  return NextResponse.json({ companyId });
}
