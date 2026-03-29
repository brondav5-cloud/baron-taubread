"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TransactionSplitsPanel } from "@/modules/finance/components/TransactionSplitsPanel";
import type { BankTransaction, DocDetailRow } from "@/modules/finance/types";

function fmt(n: number) {
  return "₪" + Math.abs(n).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function SplitEditorPage() {
  const { txId } = useParams<{ txId: string }>();
  const router = useRouter();

  const [tx, setTx] = useState<BankTransaction | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [docRows, setDocRows] = useState<DocDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const [{ data: txData, error: txErr }, { data: cats }] = await Promise.all([
        supabase.from("bank_transactions").select("*").eq("id", txId).single(),
        supabase.from("bank_categories").select("id, name, type").order("sort_order").order("name"),
      ]);

      if (txErr || !txData) { setError("תנועה לא נמצאה"); return; }
      setTx(txData as unknown as BankTransaction);
      setCategories(cats ?? []);

      // Load linked doc rows for auto-import
      const { data: links } = await supabase
        .from("transaction_document_links")
        .select("document:transaction_detail_documents(raw_data)")
        .eq("transaction_id", txId);

      const rows: DocDetailRow[] = (links ?? []).flatMap((link) => {
        const raw = (link.document as { raw_data?: { rows?: DocDetailRow[] } } | null)?.raw_data;
        return raw?.rows ?? [];
      });
      setDocRows(rows);
    } catch {
      setError("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  }, [txId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50" dir="rtl">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-gray-600">{error ?? "תנועה לא נמצאה"}</p>
        <button onClick={() => router.back()} className="text-indigo-600 hover:underline text-sm">
          חזור
        </button>
      </div>
    );
  }

  const txAmount = tx.debit > 0 ? tx.debit : tx.credit;
  const txIsDebit = tx.debit > 0;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזור
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-700 truncate">עורך פיצול תנועה</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Transaction header card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">{formatDate(tx.date)}</p>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{tx.description}</h2>
              {tx.details && <p className="text-sm text-gray-500 mt-0.5">{tx.details}</p>}
              {tx.supplier_name && (
                <p className="text-xs text-blue-600 mt-1 font-medium">ספק: {tx.supplier_name}</p>
              )}
            </div>
            <div className="flex gap-3 shrink-0">
              {txIsDebit ? (
                <div className="bg-red-50 rounded-xl px-4 py-2 text-center">
                  <p className="text-xs text-red-400">חובה</p>
                  <p className="font-bold text-red-700 text-xl">{fmt(txAmount)}</p>
                </div>
              ) : (
                <div className="bg-green-50 rounded-xl px-4 py-2 text-center">
                  <p className="text-xs text-green-400">זכות</p>
                  <p className="font-bold text-green-700 text-xl">{fmt(txAmount)}</p>
                </div>
              )}
            </div>
          </div>

          {/* P&L info */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              משפיע על רווח/הפסד
            </span>
            <span>
              כל שורת פיצול מוסיפה לסעיף הקטגוריה שלה בדוח החודשי.
              תנועה עם פיצול — הסכום הכולל לא נספר, רק הפיצולים.
            </span>
          </div>
        </div>

        {/* Split editor — full width */}
        <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
          <TransactionSplitsPanel
            txId={tx.id}
            txAmount={txAmount}
            txIsDebit={txIsDebit}
            categories={categories}
            docRows={docRows}
            onSaved={load}
          />
        </div>
      </div>
    </div>
  );
}
