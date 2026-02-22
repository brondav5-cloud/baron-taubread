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
