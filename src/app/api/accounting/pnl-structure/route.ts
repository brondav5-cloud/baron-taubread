export const dynamic = 'force-dynamic';

/**
 * GET  /api/accounting/pnl-structure
 *   → { groupLabels: Record<string,string>, customSections: PnlCustomSection[] }
 *
 * PUT  /api/accounting/pnl-structure?action=labels
 *   body: { labels: { group_code: string; custom_label: string }[] }
 *   → upsert batch of group labels
 *
 * POST /api/accounting/pnl-structure?action=section
 *   body: { name, parent_section, sort_order?, group_codes? }
 *   → create custom section
 *
 * PUT  /api/accounting/pnl-structure?action=section&id=<uuid>
 *   body: { name?, sort_order?, group_codes? }
 *   → update custom section
 *
 * DELETE /api/accounting/pnl-structure?action=section&id=<uuid>
 *   → delete custom section
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";

async function getCompanyId(req?: Request): Promise<{ companyId: string | null; error: NextResponse | null }> {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { companyId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { companyId } = await resolveSelectedCompanyId(supabase, user.id);
  if (!companyId) {
    return { companyId: null, error: NextResponse.json({ error: "יש לבחור חברה" }, { status: 403 }) };
  }
  return { companyId, error: null };
  void req;
}

export async function GET() {
  try {
    const { companyId, error } = await getCompanyId();
    if (error) return error;

    const supabase = createServerSupabaseClient();

    const [labelsRes, sectionsRes] = await Promise.all([
      supabase
        .from("group_labels")
        .select("group_code, custom_label")
        .eq("company_id", companyId!),
      supabase
        .from("pnl_custom_sections")
        .select("*")
        .eq("company_id", companyId!)
        .order("sort_order", { ascending: true }),
    ]);

    const groupLabels: Record<string, string> = {};
    for (const row of labelsRes.data ?? []) {
      groupLabels[(row as { group_code: string; custom_label: string }).group_code] =
        (row as { group_code: string; custom_label: string }).custom_label;
    }

    return NextResponse.json({
      groupLabels,
      customSections: sectionsRes.data ?? [],
    });
  } catch (err) {
    console.error("[GET pnl-structure]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { companyId, error } = await getCompanyId(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const body = await req.json();

    const supabase = createServerSupabaseClient();

    if (action === "labels") {
      const { labels } = body as { labels: { group_code: string; custom_label: string }[] };
      if (!Array.isArray(labels) || labels.length === 0) {
        return NextResponse.json({ success: true });
      }
      const rows = labels
        .filter((l) => l.group_code?.trim() && l.custom_label?.trim())
        .map((l) => ({
          company_id: companyId!,
          group_code: l.group_code.trim(),
          custom_label: l.custom_label.trim(),
          updated_at: new Date().toISOString(),
        }));

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("group_labels")
          .upsert(rows, { onConflict: "company_id,group_code" });
        if (upsertErr) throw upsertErr;
      }
      return NextResponse.json({ success: true });
    }

    if (action === "section") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const { name, sort_order, group_codes } = body as {
        name?: string;
        sort_order?: number;
        group_codes?: string[];
      };
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name !== undefined) update.name = name;
      if (sort_order !== undefined) update.sort_order = sort_order;
      if (group_codes !== undefined) update.group_codes = group_codes;

      const { data, error: updateErr } = await supabase
        .from("pnl_custom_sections")
        .update(update)
        .eq("id", id)
        .eq("company_id", companyId!)
        .select()
        .single();
      if (updateErr) throw updateErr;
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[PUT pnl-structure]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, error } = await getCompanyId(req);
    if (error) return error;

    const body = await req.json();
    const { name, parent_section, sort_order, group_codes } = body as {
      name?: string;
      parent_section?: string;
      sort_order?: number;
      group_codes?: string[];
    };

    if (!name?.trim() || !parent_section?.trim()) {
      return NextResponse.json({ error: "name and parent_section are required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error: insertErr } = await supabase
      .from("pnl_custom_sections")
      .insert({
        company_id: companyId!,
        name: name.trim(),
        parent_section: parent_section.trim(),
        sort_order: sort_order ?? 0,
        group_codes: group_codes ?? [],
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[POST pnl-structure]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { companyId, error } = await getCompanyId(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { error: deleteErr } = await supabase
      .from("pnl_custom_sections")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId!);

    if (deleteErr) throw deleteErr;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE pnl-structure]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
