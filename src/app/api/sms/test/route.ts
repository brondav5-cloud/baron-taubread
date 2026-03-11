import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/notifications/sendSms";

/**
 * POST /api/sms/test
 * Body: { to: "05xxxxxxxx", body: "Test message" }
 *
 * Use for debugging: returns raw ActiveTrail response and success/failure.
 * Protect this route in production (e.g. only allow for admins).
 */
export async function POST(request: NextRequest) {
  try {
    const { to, body } = (await request.json()) as { to?: string; body?: string };
    if (!to || !body) {
      return NextResponse.json(
        { error: "Missing to or body", usage: { to: "05xxxxxxxx", body: "Test" } },
        { status: 400 }
      );
    }

    const ok = await sendSms({ to, body });
    return NextResponse.json({ ok, to, body: body.substring(0, 50) + (body.length > 50 ? "..." : "") });
  } catch (err) {
    const e = err as Error & { status?: number; response?: unknown };
    return NextResponse.json(
      {
        ok: false,
        error: e.message,
        status: e.status,
        apiResponse: e.response,
      },
      { status: 500 }
    );
  }
}
