"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, Card, CardContent } from "@/components/ui";
import { monthRange, useErpJson } from "@/hooks/useErpJson";

const DOC_TYPES = [
  { value: "order", label: "הזמנות" },
  { value: "delivery", label: "תעודות משלוח" },
  { value: "invoice", label: "חשבוניות מס" },
  { value: "invoice_receipt", label: "חשבוניות מס קבלה" },
  { value: "credit_note", label: "זיכויים" },
  { value: "receipt", label: "קבלות" },
];

export default function ErpDocumentsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [docType, setDocType] = useState("order");

  const url = useMemo(() => {
    const { from, to } = monthRange(year, month);
    return `/api/erp/documents?doc_type=${docType}&from_date=${from}&to_date=${to}&status=all`;
  }, [docType, month, year]);

  const { data, error, loading } = useErpJson<{ data?: Array<Record<string, unknown>> }>(url);
  const rows = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-4">
      <PageHeader title="מסמכים" subtitle="קריאה בלבד מתוכנת האם" />
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          סוג
          <select
            className="block mt-1 border rounded-xl px-3 py-2"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          שנה
          <input type="number" className="block mt-1 border rounded-xl px-3 py-2 w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </label>
        <label className="text-sm">
          חודש
          <input type="number" min={1} max={12} className="block mt-1 border rounded-xl px-3 py-2 w-20" value={month} onChange={(e) => setMonth(Number(e.target.value))} />
        </label>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>
      {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
      <Card>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">אין מסמכים בטווח.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="py-2 px-3 text-right">מספר</th>
                  <th className="py-2 px-3 text-right">תאריך</th>
                  <th className="py-2 px-3 text-right">לקוח / ספק</th>
                  <th className="py-2 px-3 text-right">סטטוס</th>
                  <th className="py-2 px-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const id = row.doc_id ?? row.order_id ?? row.id;
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3">{String(id ?? "")}</td>
                      <td className="py-2 px-3">{String(row.doc_date ?? row.date ?? "")}</td>
                      <td className="py-2 px-3">{String(row.client_name ?? row.entity_name ?? row.client_id ?? "")}</td>
                      <td className="py-2 px-3">{String(row.status ?? "")}</td>
                      <td className="py-2 px-3">
                        {id != null && (
                          <a
                            className="text-primary-600 hover:underline"
                            href={`/api/erp/documents/pdf?doc_type=${docType}&doc_id=${id}`}
                          >
                            הורדה
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
