import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isErpConfigured } from "@/lib/erp/solvit/env";
import { syncErpCatalog } from "@/lib/erp/solvit/syncCatalog";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isErpConfigured()) {
    return NextResponse.json({ ok: false, error: "ERP token missing" }, { status: 503 });
  }

  const admin = getSupabaseAdmin();
  const { data: connections, error } = await admin
    .from("erp_connections")
    .select("company_id")
    .eq("enabled", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ companyId: string; ok: boolean; error?: string }> = [];
  for (const row of connections ?? []) {
    try {
      const counts = await syncErpCatalog(row.company_id as string);
      results.push({ companyId: row.company_id as string, ok: true, ...counts });
    } catch (err) {
      results.push({
        companyId: row.company_id as string,
        ok: false,
        error: err instanceof Error ? err.message : "sync failed",
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
