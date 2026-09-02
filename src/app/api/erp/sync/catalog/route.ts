import { NextRequest, NextResponse } from "next/server";
import { requireErpSession } from "@/lib/erp/solvit/session";
import {
  enrichMappedStoreFields,
  syncErpCatalog,
} from "@/lib/erp/solvit/syncCatalog";
import { SolvitRequestError } from "@/lib/erp/solvit/client";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const resolved = await requireErpSession();
  if (resolved.error) return resolved.error;
  const { session } = resolved;
  if (!["admin", "super_admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה לסנכרן" }, { status: 403 });
  }

  let enrich = false;
  try {
    const body = (await request.json()) as { enrich?: boolean };
    enrich = Boolean(body.enrich);
  } catch {
    enrich = false;
  }

  try {
    const counts = await syncErpCatalog(session.companyId);
    const enriched = enrich
      ? await enrichMappedStoreFields(session.companyId)
      : 0;
    return NextResponse.json({ ok: true, ...counts, enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "סנכרון נכשל";
    const status = err instanceof SolvitRequestError ? err.statusCode : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
