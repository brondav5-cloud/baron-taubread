import { NextRequest, NextResponse } from "next/server";
import { requireErpSession } from "@/lib/erp/solvit/session";
import { SolvitRequestError } from "@/lib/erp/solvit/client";
import {
  rangeForLookbackDays,
  syncErpDeliveries,
} from "@/lib/erp/solvit/syncDeliveries";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const resolved = await requireErpSession();
  if (resolved.error) return resolved.error;
  const { session } = resolved;
  if (!["admin", "super_admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה לסנכרן" }, { status: 403 });
  }

  let days = 90;
  try {
    const body = (await request.json()) as { days?: number };
    if (Number.isFinite(body.days) && Number(body.days) > 0) {
      days = Math.min(366, Math.floor(Number(body.days)));
    }
  } catch {
    days = 90;
  }

  const { from, to } = rangeForLookbackDays(days);
  try {
    const counts = await syncErpDeliveries(session.companyId, from, to);
    return NextResponse.json({ ok: true, days, ...counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "סנכרון חלוקה נכשל";
    const status = err instanceof SolvitRequestError ? err.statusCode : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
