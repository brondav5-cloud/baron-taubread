import { getErpBaseUrl, getErpToken } from "./env";
import type { SolvitApiResponse } from "./types";

const MIN_INTERVAL_MS = 550;
const DEFAULT_TIMEOUT_MS = 25_000;

let lastCallAt = 0;
let queue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle(): Promise<void> {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
  });
  queue = run.catch(() => undefined);
  await run;
}

export function parseStatusMsg<T>(raw: unknown): T {
  if (raw == null || typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    /* python-repr fallback from /mcp/whoami */
  }
  const jsonish = raw
    .replace(/'/g, '"')
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false")
    .replace(/\bNone\b/g, "null");
  try {
    return JSON.parse(jsonish) as T;
  } catch {
    return raw as T;
  }
}

function safeClientMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Solvit request failed";
  if (/Bearer\s|Headers\.append|invalid header/i.test(msg)) {
    return "טוקן Solvit לא תקין. יש לשמור ERP_MCP_TOKEN בשורה אחת, בלי ירידות שורה.";
  }
  return msg;
}

export class SolvitRequestError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "SolvitRequestError";
    this.statusCode = statusCode;
  }
}

export async function solvitRequest<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    timeoutMs?: number;
    raw?: boolean;
    skipThrottle?: boolean;
  },
): Promise<T> {
  const token = getErpToken();
  if (!token) {
    throw new SolvitRequestError("ERP token is not configured", 500);
  }

  const url = new URL(path.startsWith("http") ? path : `${getErpBaseUrl()}${path}`);
  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  if (!options?.skipThrottle) await throttle();

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetch(url.toString(), {
      method: options?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    if (options?.raw) {
      if (!res.ok) {
        const text = await res.text();
        throw new SolvitRequestError(text.slice(0, 300) || `HTTP ${res.status}`, res.status);
      }
      return res as T;
    }

    const json = (await res.json()) as SolvitApiResponse<unknown>;
    if (!res.ok || json.status === "ERROR") {
      const msg =
        typeof json.status_msg === "string"
          ? json.status_msg
          : `Solvit error (${res.status})`;
      throw new SolvitRequestError(msg, res.status || 400);
    }
    return parseStatusMsg<T>(json.status_msg);
  } catch (err) {
    if (err instanceof SolvitRequestError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new SolvitRequestError("Solvit request timed out", 504);
    }
    throw new SolvitRequestError(safeClientMessage(err), 502);
  } finally {
    clearTimeout(timer);
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchAllPages<T extends object>(
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  pageSize = 500,
  maxPages = 40,
  skipThrottle = false,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  for (let i = 0; i < maxPages; i++) {
    const page = await solvitRequest<T[]>(path, {
      query: { ...query, limit: pageSize, offset },
      skipThrottle,
    });
    const list = Array.isArray(page) ? page : [];
    rows.push(...list);
    if (list.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}
