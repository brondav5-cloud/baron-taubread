import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isErpConfigured } from "@/lib/erp/solvit/env";
import { syncErpCatalog } from "@/lib/erp/solvit/syncCatalog";
import { rangeForNightlyCron, syncErpDeliveries } from "@/lib/erp/solvit/syncDeliveries";

export const maxDuration = 120;

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

  const results: Array<{
    companyId: string;
    ok: boolean;
    error?: string;
    clients?: number;
    products?: number;
    deliveries?: unknown;
  }> = [];
  for (const row of connections ?? []) {
    try {
      const catalog = await syncErpCatalog(row.company_id as string);
      const { from, to } = rangeForNightlyCron();
      const deliveries = await syncErpDeliveries(row.company_id as string, from, to);
      results.push({
        companyId: row.company_id as string,
        ok: true,
        ...catalog,
        deliveries,
      });
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
