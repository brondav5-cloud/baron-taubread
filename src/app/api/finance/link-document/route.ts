import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSelectedCompanyId } from "@/lib/api/selectedCompany";
import { logError } from "@/lib/api/logger";
import type { DocType, MatchMethod } from "@/modules/finance/types";

interface LinkDocumentRequest {
  transaction_id: string;
  doc_type: DocType;
  file_name: string;
  doc_date?: string;
  total_amount?: number;
  reference?: string;
  match_method: MatchMethod;
  raw_data?: Record<string, unknown>;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });
    }

    let body: LinkDocumentRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
    }

    const { transaction_id, doc_type, file_name, doc_date, total_amount,
            reference, match_method, raw_data, notes } = body;

    if (!transaction_id || !doc_type || !file_name) {
      return NextResponse.json({ error: "שדות חובה חסרים" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify transaction belongs to this company
    const { data: tx } = await supabase
      .from("bank_transactions")
      .select("id")
      .eq("id", transaction_id)
      .eq("company_id", companyId)
      .single();

    if (!tx) {
      return NextResponse.json({ error: "תנועה לא נמצאה" }, { status: 404 });
    }

    // Create the detail document
    const { data: doc, error: docError } = await supabase
      .from("transaction_detail_documents")
      .insert({
        company_id: companyId,
        file_name,
        doc_type,
        doc_date: doc_date || null,
        total_amount: total_amount || null,
        reference: reference || null,
        uploaded_by: user.id,
        raw_data: raw_data || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (docError || !doc) {
      logError("finance/link-document: insert document", docError);
      return NextResponse.json({ error: "שגיאה בשמירת המסמך" }, { status: 500 });
    }

    // Create the link
    const { data: link, error: linkError } = await supabase
      .from("transaction_document_links")
      .insert({
        transaction_id,
        document_id: doc.id,
        match_method,
      })
      .select("id")
      .single();

    if (linkError || !link) {
      logError("finance/link-document: insert link", linkError);
      return NextResponse.json({ error: "שגיאה ביצירת הקישור" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, document_id: doc.id, link_id: link.id });
  } catch (err) {
    logError("finance/link-document: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}

// DELETE a link
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAuth = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { companyId } = await resolveSelectedCompanyId(supabaseAuth, user.id);
    if (!companyId) {
      return NextResponse.json({ error: "לא נבחרה חברה" }, { status: 400 });
    }

    const { link_id } = await request.json();
    if (!link_id) return NextResponse.json({ error: "link_id חסר" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    await supabase.from("transaction_document_links").delete().eq("id", link_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("finance/link-document DELETE: unhandled", err);
    return NextResponse.json({ error: "שגיאה פנימית" }, { status: 500 });
  }
}
