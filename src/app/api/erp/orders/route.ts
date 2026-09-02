import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireErpSession } from "@/lib/erp/solvit/session";
import { solvitRequest, SolvitRequestError, todayIso } from "@/lib/erp/solvit/client";
import { normalizeErpName } from "@/lib/erp/solvit/mapEntities";

export const maxDuration = 30;

interface OrderItemInput {
  productNameNormalized?: string;
  productExternalId?: number;
  quantity: number;
  price?: number;
}

export async function POST(request: NextRequest) {
  const resolved = await requireErpSession();
  if (resolved.error) return resolved.error;
  const { session } = resolved;
  if (!["admin", "super_admin", "editor"].includes(session.role)) {
    return NextResponse.json({ error: "אין הרשאה לשלוח הזמנה" }, { status: 403 });
  }

  const body = (await request.json()) as {
    storeExternalId?: number;
    orderDate?: string;
    notes?: string;
    items?: OrderItemInput[];
  };

  const storeExternalId = Number(body.storeExternalId);
  const items = body.items ?? [];
  if (!Number.isFinite(storeExternalId) || items.length === 0) {
    return NextResponse.json(
      { error: "נדרשים מזהה חנות ופריטים" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: clientMap } = await admin
    .from("erp_entity_map")
    .select("erp_id, reviewed")
    .eq("company_id", session.companyId)
    .eq("entity_type", "client")
    .eq("local_external_id", storeExternalId)
    .maybeSingle();

  if (!clientMap?.erp_id || !clientMap.reviewed) {
    return NextResponse.json(
      { error: "החנות לא ממופה ל-Solvit או שהמיפוי לא אושר" },
      { status: 409 },
    );
  }

  const { data: productMaps } = await admin
    .from("erp_entity_map")
    .select("erp_id, local_external_id, reviewed")
    .eq("company_id", session.companyId)
    .eq("entity_type", "product")
    .eq("reviewed", true);

  const { data: localProducts } = await admin
    .from("products")
    .select("external_id, name")
    .eq("company_id", session.companyId);

  const productByExt = new Map(
    (localProducts ?? []).map((p) => [p.external_id as number, p]),
  );
  const productByName = new Map(
    (localProducts ?? []).map((p) => [normalizeErpName(String(p.name)), p]),
  );
  const erpByLocal = new Map(
    (productMaps ?? []).map((m) => [m.local_external_id as number, m.erp_id as number]),
  );

  const resolvedItems: Array<{ product_id: number; quantity: number; price?: number }> = [];
  const missing: string[] = [];

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    let localId = item.productExternalId;
    if (localId == null && item.productNameNormalized) {
      const local = productByName.get(normalizeErpName(item.productNameNormalized));
      localId = local?.external_id as number | undefined;
    }
    if (localId == null) {
      missing.push(item.productNameNormalized || String(item.productExternalId));
      continue;
    }
    const erpId = erpByLocal.get(localId);
    if (!erpId) {
      missing.push(productByExt.get(localId)?.name ?? String(localId));
      continue;
    }
    resolvedItems.push({
      product_id: erpId,
      quantity: qty,
      ...(item.price != null ? { price: item.price } : {}),
    });
  }

  if (missing.length) {
    return NextResponse.json(
      { error: "מוצרים לא ממופים ל-Solvit", missing },
      { status: 409 },
    );
  }
  if (!resolvedItems.length) {
    return NextResponse.json({ error: "אין פריטים תקפים" }, { status: 400 });
  }

  const orderDate = body.orderDate || todayIso();
  const payload = {
    client_id: clientMap.erp_id,
    order_date: orderDate,
    items: resolvedItems,
    notes: body.notes ?? "Bakery Analytics smart order",
  };

  try {
    const conflicts = await solvitRequest<{ conflicts?: unknown[] }>(
      "/mcp/orders/find_conflicts",
      {
        method: "POST",
        body: { client_id: clientMap.erp_id, date: orderDate },
      },
    );
    const conflictList = Array.isArray(conflicts?.conflicts) ? conflicts.conflicts : [];
    if (conflictList.length) {
      await admin.from("erp_write_log").insert({
        company_id: session.companyId,
        action: "orders.new.blocked_conflict",
        payload,
        result: { conflicts: conflictList },
        status: "error",
        created_by: session.userId,
      });
      return NextResponse.json(
        { error: "נמצאה הזמנה קיימת לאותו לקוח ותאריך", conflicts: conflictList },
        { status: 409 },
      );
    }

    const created = await solvitRequest<{ order_id?: number }>(
      "/mcp/orders/new",
      { method: "POST", body: payload },
    );

    await admin.from("erp_write_log").insert({
      company_id: session.companyId,
      action: "orders.new",
      payload,
      result: created,
      status: "success",
      created_by: session.userId,
    });

    return NextResponse.json({ ok: true, order: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שליחת הזמנה נכשלה";
    await admin.from("erp_write_log").insert({
      company_id: session.companyId,
      action: "orders.new",
      payload,
      result: { error: message },
      status: "error",
      created_by: session.userId,
    });
    const status = err instanceof SolvitRequestError ? err.statusCode : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
