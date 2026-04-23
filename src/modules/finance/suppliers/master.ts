import type { SupabaseClient } from "@supabase/supabase-js";

const QUOTE_RE = /["'`׳״]/g;
const NON_TEXT_RE = /[^a-z0-9א-ת\s]/gi;

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeSupplierName(value: string): string {
  const lowered = value.toLowerCase().replace(QUOTE_RE, "").replace(NON_TEXT_RE, " ");
  return collapseSpaces(
    lowered
      .replace(/\b(בעמ|בע\s?מ|בע"מ|בע''מ|בע׳׳מ)\b/g, "")
      .replace(/\bחברה\b/g, " ")
  );
}

export function cleanSupplierDisplayName(value: string): string {
  return collapseSpaces(value.replace(QUOTE_RE, ""));
}

export interface SupplierMasterRecord {
  id: string;
  master_name: string;
}

export async function resolveOrCreateSupplierMaster(opts: {
  supabase: SupabaseClient;
  companyId: string;
  inputName: string;
}): Promise<{ supplierId: string; masterName: string } | null> {
  const cleaned = cleanSupplierDisplayName(opts.inputName);
  const normalized = normalizeSupplierName(cleaned);
  if (!cleaned || !normalized) return null;

  const { data: aliasMatch } = await opts.supabase
    .from("finance_supplier_aliases")
    .select("supplier:finance_suppliers(id, master_name)")
    .eq("company_id", opts.companyId)
    .eq("normalized_alias", normalized)
    .maybeSingle();

  const aliasSupplier = (aliasMatch as { supplier?: SupplierMasterRecord | null } | null)?.supplier;
  if (aliasSupplier?.id) {
    if (cleaned !== aliasSupplier.master_name) {
      await opts.supabase
        .from("finance_supplier_aliases")
        .upsert(
          {
            company_id: opts.companyId,
            supplier_id: aliasSupplier.id,
            alias_name: cleaned,
            normalized_alias: normalized,
          },
          { onConflict: "company_id,normalized_alias" }
        );
    }
    return { supplierId: aliasSupplier.id, masterName: aliasSupplier.master_name };
  }

  const { data: supplierByNormalized } = await opts.supabase
    .from("finance_suppliers")
    .select("id, master_name")
    .eq("company_id", opts.companyId)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (supplierByNormalized?.id) {
    await opts.supabase
      .from("finance_supplier_aliases")
      .upsert(
        {
          company_id: opts.companyId,
          supplier_id: supplierByNormalized.id,
          alias_name: cleaned,
          normalized_alias: normalized,
        },
        { onConflict: "company_id,normalized_alias" }
      );
    return { supplierId: supplierByNormalized.id, masterName: supplierByNormalized.master_name };
  }

  const { data: created, error: createErr } = await opts.supabase
    .from("finance_suppliers")
    .insert({
      company_id: opts.companyId,
      master_name: cleaned,
      normalized_name: normalized,
    })
    .select("id, master_name")
    .single();
  if (createErr || !created?.id) return null;

  await opts.supabase
    .from("finance_supplier_aliases")
    .insert({
      company_id: opts.companyId,
      supplier_id: created.id,
      alias_name: cleaned,
      normalized_alias: normalized,
    });

  return { supplierId: created.id, masterName: created.master_name };
}
