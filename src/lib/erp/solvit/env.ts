const DEFAULT_BASE_URL = "https://nihulkav.online:4000";

function sanitizeEnv(raw: string | undefined): string {
  return (raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n\t "']+/g, "")
    .trim();
}

export function getErpBaseUrl(): string {
  const raw = sanitizeEnv(process.env.ERP_MCP_BASE_URL) || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function getErpToken(): string {
  return sanitizeEnv(process.env.ERP_MCP_TOKEN).replace(/^Bearer/i, "");
}

export function isErpConfigured(): boolean {
  return getErpToken().length > 0;
}
