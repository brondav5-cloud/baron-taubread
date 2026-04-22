export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

type BlockKind = "income" | "cost_of_goods" | "operating" | "admin" | "finance" | "other";

interface LayoutBlockPayload {
  id: string;
  name: string;
  kind: BlockKind;
  sort_order: number;
  categories: { category_id: string; sort_order: number }[];
}

async function getCompanyId() {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { supabase, companyId: null as string | null, error: NextResponse.json({ error: "לא מורשה" }, { status: 401 }) };
  }

  const { companyId } = await resolveSelectedCompanyId(supabase, user.id);
  if (!companyId) {
    return { supabase, companyId: null as string | null, error: NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 }) };
  }

  return { supabase, companyId, error: null as NextResponse<unknown> | null };
}

export async function GET() {
  try {
    const { supabase, companyId, error } = await getCompanyId();
    if (error) return error;

    const [blocksRes, linksRes] = await Promise.all([
      supabase
        .from("finance_pnl_blocks")
        .select("id, name, kind, sort_order")
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("finance_pnl_block_categories")
        .select("block_id, category_id, sort_order")
        .eq("company_id", companyId)
        .order("sort_order", { ascending: true }),
    ]);

    if (blocksRes.error) throw blocksRes.error;
    if (linksRes.error) throw linksRes.error;

    const linksByBlock = new Map<string, { category_id: string; sort_order: number }[]>();
    for (const row of linksRes.data ?? []) {
      const current = linksByBlock.get(row.block_id) ?? [];
      current.push({ category_id: row.category_id, sort_order: row.sort_order });
      linksByBlock.set(row.block_id, current);
    }

    const blocks = (blocksRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind as BlockKind,
      sort_order: row.sort_order,
      categories: (linksByBlock.get(row.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    }));

    return NextResponse.json({ blocks });
  } catch (err) {
    console.error("[GET finance/pnl/layout]", err);
    return NextResponse.json({ error: "שגיאה בטעינת מבנה הדוח" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { supabase, companyId, error } = await getCompanyId();
    if (error) return error;

    const body = await req.json() as { blocks?: LayoutBlockPayload[] };
    const blocks = body.blocks ?? [];

    const idsToKeep = new Set(blocks.map((b) => b.id));
    const { data: existingBlocks, error: existingErr } = await supabase
      .from("finance_pnl_blocks")
      .select("id")
      .eq("company_id", companyId);
    if (existingErr) throw existingErr;

    const existingIds = (existingBlocks ?? []).map((b) => b.id);
    const idsToDelete = existingIds.filter((id) => !idsToKeep.has(id));

    if (idsToDelete.length > 0) {
      const { error: deleteErr } = await supabase
        .from("finance_pnl_blocks")
        .delete()
        .eq("company_id", companyId)
        .in("id", idsToDelete);
      if (deleteErr) throw deleteErr;
    }

    if (blocks.length > 0) {
      const blockRows = blocks.map((b) => ({
        id: b.id,
        company_id: companyId,
        name: b.name.trim(),
        kind: b.kind,
        sort_order: b.sort_order,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertBlocksErr } = await supabase
        .from("finance_pnl_blocks")
        .upsert(blockRows, { onConflict: "id" });
      if (upsertBlocksErr) throw upsertBlocksErr;
    }

    const { error: clearLinksErr } = await supabase
      .from("finance_pnl_block_categories")
      .delete()
      .eq("company_id", companyId);
    if (clearLinksErr) throw clearLinksErr;

    const links = blocks.flatMap((b) =>
      b.categories.map((c) => ({
        company_id: companyId,
        block_id: b.id,
        category_id: c.category_id,
        sort_order: c.sort_order,
      })),
    );

    if (links.length > 0) {
      const { error: insertLinksErr } = await supabase
        .from("finance_pnl_block_categories")
        .insert(links);
      if (insertLinksErr) throw insertLinksErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT finance/pnl/layout]", err);
    return NextResponse.json({ error: "שגיאה בשמירת מבנה הדוח" }, { status: 500 });
  }
}
