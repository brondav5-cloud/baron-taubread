import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchAllPages, todayIso } from "./client";
import type { ErpClientRow, ErpProductRow } from "./types";

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

export function mapSolvitClient(raw: Record<string, unknown>): ErpClientRow {
  return {
    erp_id: Number(raw.client_id),
    client_name: String(raw.client_name ?? raw.business_name ?? raw.client_id),
    business_name: asString(raw.business_name),
    tax_id: asString(raw.tax_id),
    address: asString(raw.address),
    phone_primary: asString(raw.phone_primary),
    email: asString(raw.email),
    category: asString(raw.category),
    city: asString(raw.location) ?? asString(raw.city),
    agent_name: asString(raw.agent_name),
    driver_id: asNumber(raw.driver_id),
    driver_name: asString(raw.driver_name),
    collector_id: asNumber(raw.collector_id),
    collector_name: asString(raw.collector_name),
    ext_ref: asString(raw.ext_ref),
    active: raw.active === 0 || raw.active === false ? false : true,
  };
}

export function mapSolvitProduct(raw: Record<string, unknown>): ErpProductRow {
  return {
    erp_id: Number(raw.product_id),
    product_name: String(raw.product_name ?? raw.product_id),
    barcode: asString(raw.barcode),
    category: asString(raw.category),
    price: asNumber(raw.price),
    ext_ref: asString(raw.ext_ref),
    active: raw.active === 0 || raw.active === false ? false : true,
  };
}

export async function syncErpCatalog(companyId: string): Promise<{
  clients: number;
  products: number;
}> {
  const asOf = todayIso();
  const [clientRaw, productRaw] = await Promise.all([
    fetchAllPages<Record<string, unknown>>("/mcp/clients", {
      as_of_date: asOf,
      active_only: "0",
    }),
    fetchAllPages<Record<string, unknown>>("/mcp/products", {
      as_of_date: asOf,
      active_only: "0",
    }),
  ]);

  const clients = clientRaw
    .map(mapSolvitClient)
    .filter((r) => Number.isFinite(r.erp_id));
  const products = productRaw
    .map(mapSolvitProduct)
    .filter((r) => Number.isFinite(r.erp_id));

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const clientRecords = clients.map((c) => ({
    company_id: companyId,
    ...c,
    raw: clientRaw.find((r) => Number(r.client_id) === c.erp_id) ?? null,
    synced_at: now,
  }));
  const productRecords = products.map((p) => ({
    company_id: companyId,
    ...p,
    raw: productRaw.find((r) => Number(r.product_id) === p.erp_id) ?? null,
    synced_at: now,
  }));

  if (clientRecords.length) {
    const { error } = await admin.from("erp_clients").upsert(clientRecords, {
      onConflict: "company_id,erp_id",
    });
    if (error) throw new Error(error.message);
  }
  if (productRecords.length) {
    const { error } = await admin.from("erp_products").upsert(productRecords, {
      onConflict: "company_id,erp_id",
    });
    if (error) throw new Error(error.message);
  }

  await admin
    .from("erp_connections")
    .update({
      last_catalog_sync_at: now,
      last_ok_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq("company_id", companyId);

  return { clients: clients.length, products: products.length };
}

export async function enrichMappedStoreFields(companyId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data: maps, error: mapError } = await admin
    .from("erp_entity_map")
    .select("erp_id, local_external_id")
    .eq("company_id", companyId)
    .eq("entity_type", "client")
    .eq("reviewed", true);
  if (mapError) throw new Error(mapError.message);
  if (!maps?.length) return 0;

  const { data: clients, error: clientError } = await admin
    .from("erp_clients")
    .select("erp_id, agent_name, driver_name, city")
    .eq("company_id", companyId);
  if (clientError) throw new Error(clientError.message);

  const byErp = new Map(
    (clients ?? []).map((c) => [c.erp_id as number, c]),
  );
  let updated = 0;
  for (const row of maps) {
    const client = byErp.get(row.erp_id as number);
    if (!client) continue;
    const patch: Record<string, string> = {};
    if (client.driver_name) patch.driver = String(client.driver_name);
    if (client.agent_name) patch.agent = String(client.agent_name);
    if (client.city) patch.city = String(client.city);
    if (!Object.keys(patch).length) continue;
    const { error } = await admin
      .from("stores")
      .update(patch)
      .eq("company_id", companyId)
      .eq("external_id", row.local_external_id);
    if (!error) updated += 1;
  }
  return updated;
}
