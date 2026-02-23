/**
 * Simple in-memory rate limiter for API routes.
 * Works per serverless instance - for global limits consider Upstash Redis.
 * Sliding window: max N requests per windowMs per identifier (e.g. IP).
 */

const store = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL = 60_000;

function cleanup() {
  const now = Date.now();
  for (const [key, val] of Array.from(store.entries())) {
    if (val.resetAt < now) store.delete(key);
  }
}

let lastCleanup = 0;
function maybeCleanup() {
  if (Date.now() - lastCleanup > CLEANUP_INTERVAL) {
    lastCleanup = Date.now();
    cleanup();
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter?: number;
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  maybeCleanup();
  const now = Date.now();
  const key = identifier;
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }

  if (entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining: maxRequests - entry.count };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return ip;
}

/**
 * DB-based upload rate limit — works across all serverless instances.
 * Checks the `uploads` table for recent uploads by this company.
 * Fail-open: if the query fails, the upload is allowed.
 */
export async function checkUploadRateDb(
  supabase: { from: (table: string) => unknown },
  companyId: string,
  maxUploads: number,
  windowMinutes: number,
): Promise<RateLimitResult> {
  try {
    const since = new Date(
      Date.now() - windowMinutes * 60_000,
    ).toISOString();

    const { count, error } = await (supabase as ReturnType<typeof Object>)
      .from("uploads")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("uploaded_at", since);

    if (error || count === null) return { ok: true, remaining: maxUploads };

    if (count >= maxUploads) {
      return {
        ok: false,
        remaining: 0,
        retryAfter: windowMinutes * 60,
      };
    }
    return { ok: true, remaining: maxUploads - count };
  } catch {
    return { ok: true, remaining: maxUploads };
  }
}
