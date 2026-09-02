import { NextRequest, NextResponse } from "next/server";
import { requireErpSession } from "./session";
import { solvitRequest, SolvitRequestError } from "./client";
import { getCachedReport, setCachedReport } from "./reportCache";

export async function proxySolvitReport(
  request: NextRequest,
  path: string,
  required: string[] = [],
) {
  const resolved = await requireErpSession();
  if (resolved.error) return resolved.error;
  const { session } = resolved;

  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  for (const key of required) {
    if (!query[key]) {
      return NextResponse.json(
        { error: `חסר פרמטר ${key}` },
        { status: 400 },
      );
    }
  }

  const cacheKey = `${session.companyId}:${path}:${JSON.stringify(query)}`;
  const cached = getCachedReport<unknown>(cacheKey);
  if (cached !== null) {
    return NextResponse.json({ ok: true, cached: true, data: cached });
  }

  try {
    const data = await solvitRequest<unknown>(path, { query });
    setCachedReport(cacheKey, data);
    return NextResponse.json({ ok: true, cached: false, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאת דוח";
    const status = err instanceof SolvitRequestError ? err.statusCode : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
