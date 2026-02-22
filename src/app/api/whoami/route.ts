import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY required for whoami");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export interface WhoamiCompany {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("company_id, role, name")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = userRow?.role === "super_admin";

  let companies: WhoamiCompany[] = [];

  if (isSuperAdmin) {
    const { data: allCompanies } = await supabase
      .from("companies")
      .select("id, name, slug")
      .eq("is_active", true);
    companies =
      allCompanies?.map((c) => ({
        id: c.id,
        name: c.name ?? "",
        slug: c.slug ?? "",
        role: "super_admin",
      })) ?? [];
  } else {
    const { data: memberships } = await supabase
      .from("user_companies")
      .select("company_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { ok: false, reason: "USER_NOT_LINKED" },
        { status: 403 },
      );
    }

    const companyIds = memberships.map((m) => m.company_id);
    const admin = getSupabaseAdmin();
    const { data: companyRows } = await admin
      .from("companies")
      .select("id, name, slug")
      .in("id", companyIds)
      .eq("is_active", true);

    const companyMap = new Map(
      companyRows?.map((c) => [String(c.id), c]) ?? [],
    );
    companies = memberships.map((m) => {
      const c = companyMap.get(String(m.company_id));
      return {
        id: m.company_id,
        name: c?.name ?? "",
        slug: c?.slug ?? "",
        role: m.role ?? "viewer",
      };
    });
  }

  const { companyId: selectedCompanyId, role: selectedCompanyRole } =
    await resolveSelectedCompanyId(supabase, user.id);

  return NextResponse.json({
    ok: true,
    userId: user.id,
    companies,
    selectedCompanyId,
    selectedCompanyRole: selectedCompanyRole ?? null,
    companyId: selectedCompanyId,
    role: selectedCompanyRole ?? null,
    userName: userRow?.name ?? user.email ?? "משתמש",
    userEmail: user.email ?? "",
  });
}
