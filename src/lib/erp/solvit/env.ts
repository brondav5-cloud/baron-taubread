const DEFAULT_BASE_URL = "https://nihulkav.online:4000";

export function getErpBaseUrl(): string {
  const raw = process.env.ERP_MCP_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function getErpToken(): string {
  return process.env.ERP_MCP_TOKEN?.trim() ?? "";
}

export function isErpConfigured(): boolean {
  return getErpToken().length > 0;
}
