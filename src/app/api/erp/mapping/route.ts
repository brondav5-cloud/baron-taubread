import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireErpSession } from "@/lib/erp/solvit/session";
import {
  buildMappingPreview,
  toErpClientPreview,
  toErpProductPreview,
} from "@/lib/erp/solvit/mapEntities";
import { fetchAllPages, todayIso } from "@/lib/erp/solvit/client";
import {
  mapSolvitClient,
  mapSolvitProduct,
} from "@/lib/erp/solvit/syncCatalog";
import type {
  ErpEntityType,
  ErpMatchConfidence,
  ErpMatchMethod,
  MappingCandidate,
} from "@/lib/erp/solvit/types";

export const maxDuration = 60;

function asEntityType(value: string | null): ErpEntityType {
  return value === "product" ? "product" : "client";
}

async function loadErpRows(
  companyId: string,
  entityType: ErpEntityType,
): Promise<Array<{ erp_id: number; name: string; ext_ref: string | null }>> {
  const admin = getSupabaseAdmin();
  if (entityType === "client") {
    const { data } = await admin
      .from("erp_clients")
      .select("erp_id, client_name, ext_ref")
      .eq("company_id", companyId);
    if (data?.length) {
      return data.map((r) => ({
        erp_id: r.erp_id as number,
        name: String(r.client_name),
        ext_ref: (r.ext_ref as string | null) ?? null,
      }));
    }
    const live = await fetchAllPages<Record<string, unknown>>("/mcp/clients", {
      as_of_date: todayIso(),
      active_only: "0",
    });
    return live.map(mapSolvitClient).map(toErpClientPreview);
  }

  const { data } = await admin
    .from("erp_products")
    .select("erp_id, product_name, ext_ref")
    .eq("company_id", companyId);
  if (data?.length) {
    return data.map((r) => ({
      erp_id: r.erp_id as number,
      name: String(r.product_name),
      ext_ref: (r.ext_ref as string | null) ?? null,
    }));
  }
  const live = await fetchAllPages<Record<string, unknown>>("/mcp/products", {
    as_of_date: todayIso(),
    active_only: "0",
  });
  return live.map(mapSolvitProduct).map(toErpProductPreview);
}

async function computeMapping(
  companyId: string,
  entityType: ErpEntityType,
): Promise<{ rows: MappingCandidate[]; totalErp: number; totalLocal: number }> {
  const admin = getSupabaseAdmin();
  const table = entityType === "client" ? "stores" : "products";
  const [{ data: localRows, error: localError }, { data: saved }] = await Promise.all([
    admin.from(table).select("external_id, name").eq("company_id", companyId),
    admin
      .from("erp_entity_map")
      .select("erp_id, local_external_id, match_method, confidence, reviewed")
      .eq("company_id", companyId)
      .eq("entity_type", entityType),
  ]);
  if (localError) throw new Error(localError.message);
  const erpRows = await loadErpRows(companyId, entityType);
  return {
    totalErp: erpRows.length,
    totalLocal: localRows?.length ?? 0,
    rows: buildMappingPreview({
      entityType,
      erpRows,
      localRows: (localRows ?? []).map((r) => ({
        external_id: r.external_id as number,
        name: String(r.name),
      })),
      saved: (saved ?? []) as Array<{
        erp_id: number;
        local_external_id: number;
        match_method: ErpMatchMethod;
        confidence: ErpMatchConfidence;
        reviewed: boolean;
      }>,
    }),
  };
}

export async function GET(request: NextRequest) {
  const resolved = await requireErpSession();
  if (resolved.error) return resolved.error;
  const entityType = asEntityType(request.nextUrl.searchParams.get("entity_type"));

  try {
    const { rows, totalErp, totalLocal } = await computeMapping(
      resolved.session.companyId,
      entityType,
    );
    const matched = rows.filter((r) => r.status === "matched").length;
    return NextResponse.json({
      entityType,
      summary: {
        matched,
        unmatchedErp: rows.filter((r) => r.status === "unmatched_erp").length,
        unmatchedLocal: rows.filter((r) => r.status === "unmatched_local").length,
        duplicates: rows.filter((r) => r.status === "duplicate").length,
        totalErp,
        totalLocal,
        matchPct: totalErp > 0 ? Math.round((matched / totalErp) * 100) : 0,
      },
      rows,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "שגיאת מיפוי" },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const resolved = await requireErpSession();
  if (resolved.error) return resolved.error;
  const { session } = resolved;
  if (!["admin", "super_admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה לשמור מיפוי" }, { status: 403 });
  }

  const body = (await request.json()) as {
    entity_type?: ErpEntityType;
    auto?: boolean;
    rows?: Array<{
      erp_id: number;
      local_external_id: number;
      match_method: ErpMatchMethod;
      confidence?: ErpMatchConfidence;
    }>;
  };

  const entityType = asEntityType(body.entity_type ?? "client");
  const admin = getSupabaseAdmin();
  let rows = body.rows ?? [];

  if (body.auto) {
    const preview = await computeMapping(session.companyId, entityType);
    rows = preview.rows
      .filter(
        (r) =>
          r.status === "matched" &&
          r.local_external_id != null &&
          r.erp_id > 0 &&
          (r.confidence === "high" || r.match_method === "id"),
      )
      .map((r) => ({
        erp_id: r.erp_id,
        local_external_id: r.local_external_id as number,
        match_method: r.match_method ?? "id",
        confidence: r.confidence ?? "high",
      }));
  }

  if (!rows.length) {
    return NextResponse.json({ error: "אין שורות לשמירה" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const records = rows.map((r) => ({
    company_id: session.companyId,
    entity_type: entityType,
    erp_id: r.erp_id,
    local_external_id: r.local_external_id,
    match_method: r.match_method,
    confidence: r.confidence ?? "medium",
    reviewed: true,
    updated_at: now,
  }));

  const { error } = await admin.from("erp_entity_map").upsert(records, {
    onConflict: "company_id,entity_type,erp_id",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: records.length, entityType });
}
