import type { NextRequest } from "next/server";

/**
 * Read JSON body with size limit. When Content-Length is missing, enforces limit
 * while streaming to avoid loading oversized bodies into memory.
 */
export async function readJsonWithLimit(
  request: NextRequest,
  maxBytes: number,
): Promise<{ ok: true; data: unknown } | { ok: false; status: 413 }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const len = parseInt(contentLength, 10);
    if (!Number.isNaN(len) && len > maxBytes) {
      return { ok: false, status: 413 };
    }
  }
  if (contentLength) {
    try {
      const data = await request.json();
      return { ok: true, data };
    } catch {
      throw new Error("Invalid JSON");
    }
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, data: {} };
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) return { ok: false, status: 413 };
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks);
  try {
    return { ok: true, data: JSON.parse(buffer.toString("utf-8")) };
  } catch {
    throw new Error("Invalid JSON");
  }
}
