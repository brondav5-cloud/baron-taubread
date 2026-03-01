/**
 * GET /api/accounting/suppliers
 * Returns suppliers with names and classifications for the selected company.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

const PAGE = 1000;

type SupplierRow = { id: string; counter_account: string; display_name: string; auto_account_code: string | null; auto_account_name: string | null };
type ClassRow = { supplier_id: string; manual_account_code: string; manual_account_name: string | null };

async function fetchAllSuppliers(supabase: SupabaseClient, companyId: string): Promise<SupplierRow[]> {
  const out: SupplierRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, counter_account, display_name, auto_account_code, auto_account_name")
      .eq("company_id", companyId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...(data as SupplierRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function fetchAllClassifications(supabase: SupabaseClient, companyId: string): Promise<ClassRow[]> {
  const out: ClassRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("supplier_classifications")
      .select("supplier_id, manual_account_code, manual_account_name")
      .eq("company_id", companyId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...(data as ClassRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function GET() {
  try {
    const authClient = createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(authClient, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    const [suppliers, classifications] = await Promise.all([
      fetchAllSuppliers(supabase, companyId),
      fetchAllClassifications(supabase, companyId),
    ]);

    const supplierIds = suppliers.map(s => s.id);
    type NameRow = { id: string; supplier_id: string; name: string; occurrence_count: number; counter_account_override: string | null };
    let namesData: NameRow[] = [];
    if (supplierIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < supplierIds.length; i += 200) {
        chunks.push(supplierIds.slice(i, i + 200));
      }
      const nameChunks = await Promise.all(
        chunks.map(ids =>
          supabase
            .from("supplier_names")
            .select("id, supplier_id, name, occurrence_count, counter_account_override")
            .in("supplier_id", ids),
        ),
      );
      namesData = nameChunks.flatMap(r => (r.data ?? [])) as NameRow[];
    }

    const classMap = new Map(
      classifications.map(c => [c.supplier_id, { manual_account_code: c.manual_account_code, manual_account_name: c.manual_account_name }]),
    );
    const namesBySupplier = new Map<string, typeof namesData>();
    for (const n of namesData) {
      if (!namesBySupplier.has(n.supplier_id)) namesBySupplier.set(n.supplier_id, []);
      namesBySupplier.get(n.supplier_id)!.push(n);
    }

    const result = suppliers.map(s => ({
      ...s,
      names: namesBySupplier.get(s.id) ?? [],
      classification: classMap.get(s.id) ?? null,
    }));

    return NextResponse.json({ suppliers: result });
  } catch (err) {
    console.error("Suppliers GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
