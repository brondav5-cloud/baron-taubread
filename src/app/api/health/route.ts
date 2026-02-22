import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring, load balancers, and uptime checks.
 * Returns 200 when the app is healthy.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
