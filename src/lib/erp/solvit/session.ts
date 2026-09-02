import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { isErpConfigured } from "./env";
import type { ErpConnectionRow } from "./types";

export interface ErpSession {
  userId: string;
  companyId: string;
  role: string;
  connection: ErpConnectionRow;
}

export async function requireErpSession(): Promise<
  { session: ErpSession; error?: undefined } | { session?: undefined; error: NextResponse }
> {
  const supabaseAuth = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 }),
    };
  }

  const { companyId, role } = await resolveSelectedCompanyId(supabaseAuth, user.id);
  if (!companyId) {
    return {
      error: NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 }),
    };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("erp_connections")
    .select(
      "id, company_id, erp_company_id, erp_company_slug, enabled, last_ok_at, last_error, last_catalog_sync_at",
    )
    .eq("company_id", companyId)
    .eq("enabled", true)
    .maybeSingle();

  if (error) {
    return {
      error: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }
  if (!data) {
    return {
      error: NextResponse.json(
        { error: "אין חיבור Solvit לחברה הנבחרת" },
        { status: 404 },
      ),
    };
  }
  if (!isErpConfigured()) {
    return {
      error: NextResponse.json(
        { error: "טוקן Solvit לא הוגדר בשרת" },
        { status: 503 },
      ),
    };
  }

  return {
    session: {
      userId: user.id,
      companyId,
      role,
      connection: data as ErpConnectionRow,
    },
  };
}

export async function markConnectionOk(companyId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from("erp_connections")
    .update({
      last_ok_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);
}

export async function markConnectionError(
  companyId: string,
  message: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from("erp_connections")
    .update({
      last_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);
}
