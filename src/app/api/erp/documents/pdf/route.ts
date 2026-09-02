import { NextRequest, NextResponse } from "next/server";
import { requireErpSession } from "@/lib/erp/solvit/session";
import { solvitRequest, SolvitRequestError } from "@/lib/erp/solvit/client";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const resolved = await requireErpSession();
  if (resolved.error) return resolved.error;

  const docType = request.nextUrl.searchParams.get("doc_type");
  const docId = request.nextUrl.searchParams.get("doc_id");
  if (!docType || !docId) {
    return NextResponse.json(
      { error: "נדרשים doc_type ו-doc_id" },
      { status: 400 },
    );
  }

  try {
    const data = await solvitRequest<{ pdf_base64?: string; filename?: string }>(
      "/mcp/documents/pdf",
      {
        query: { doc_type: docType, doc_id: docId, base64: "1" },
      },
    );
    if (!data?.pdf_base64) {
      return NextResponse.json({ error: "לא התקבל PDF" }, { status: 502 });
    }
    const bytes = new Uint8Array(Buffer.from(data.pdf_base64, "base64"));
    const filename = data.filename || `${docType}-${docId}.pdf`;
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאת PDF";
    const status = err instanceof SolvitRequestError ? err.statusCode : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
