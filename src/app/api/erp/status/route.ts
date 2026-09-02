import { NextResponse } from "next/server";
import { isErpConfigured } from "@/lib/erp/solvit/env";
import { solvitRequest, SolvitRequestError } from "@/lib/erp/solvit/client";
import {
  markConnectionError,
  markConnectionOk,
  requireErpSession,
} from "@/lib/erp/solvit/session";
import type { ErpWhoami } from "@/lib/erp/solvit/types";

export const maxDuration = 30;

export async function GET() {
  const resolved = await requireErpSession();
  if (resolved.error) {
    if (resolved.error.status === 404) {
      return NextResponse.json({
        connected: false,
        configured: isErpConfigured(),
        reason: "no_connection",
      });
    }
    return resolved.error;
  }

  const { session } = resolved;
  try {
    const whoami = await solvitRequest<ErpWhoami>("/mcp/whoami");
    await markConnectionOk(session.companyId);
    return NextResponse.json({
      connected: true,
      configured: true,
      companyId: session.companyId,
      connection: session.connection,
      whoami,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאת חיבור";
    await markConnectionError(session.companyId, message);
    const status = err instanceof SolvitRequestError ? err.statusCode : 502;
    return NextResponse.json(
      {
        connected: false,
        configured: true,
        companyId: session.companyId,
        connection: session.connection,
        error: message,
      },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
}
