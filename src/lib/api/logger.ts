/**
 * Safe logger - in production avoids logging sensitive data and full stack traces.
 */

const isProd = process.env.NODE_ENV === "production";

export function logError(
  context: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const payload: Record<string, unknown> = {
    context,
    message,
    ...(extra || {}),
  };
  if (!isProd && err instanceof Error && err.stack) {
    payload.stack = err.stack;
  }
  console.error(`[${context}]`, JSON.stringify(payload));
}
