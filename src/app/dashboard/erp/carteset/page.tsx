"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, Card, CardContent } from "@/components/ui";
import { todayIso, useErpJson } from "@/hooks/useErpJson";

export default function ErpCartesetPage() {
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayIso());
  const [query, setQuery] = useState<string | null>(null);

  const { data, error, loading } = useErpJson<{
    data?: {
      opening_balance?: number;
      closing_balance?: number;
      rows?: Array<Record<string, unknown>>;
    };
  }>(query);

  return (
    <div className="space-y-4">
      <PageHeader title="כרטסת" subtitle="תנועות לקוח מתוכנת האם" />
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          מזהה לקוח ב-Solvit
          <input
            className="block mt-1 border rounded-xl px-3 py-2 w-36"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </label>
        <label className="text-sm">
          מתאריך
          <input type="date" className="block mt-1 border rounded-xl px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          עד תאריך
          <input type="date" className="block mt-1 border rounded-xl px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button
          className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm"
          onClick={() => {
            if (!clientId) return;
            setQuery(`/api/erp/reports/carteset?client_id=${clientId}&from_date=${from}&to_date=${to}`);
          }}
        >
          הצג
        </button>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>
      {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
      {data?.data && (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              יתרת פתיחה: {data.data.opening_balance ?? "—"} · יתרת סגירה: {data.data.closing_balance ?? "—"}
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="py-2 px-3 text-right">תאריך</th>
                    <th className="py-2 px-3 text-right">סוג</th>
                    <th className="py-2 px-3 text-right">מסמך</th>
                    <th className="py-2 px-3 text-right">חיוב</th>
                    <th className="py-2 px-3 text-right">זיכוי</th>
                    <th className="py-2 px-3 text-right">יתרה</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.data.rows ?? []).map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3">{String(row.mv_date ?? "")}</td>
                      <td className="py-2 px-3">{String(row.kind ?? "")}</td>
                      <td className="py-2 px-3">{String(row.doc_id ?? "")}</td>
                      <td className="py-2 px-3">{String(row.charge ?? "")}</td>
                      <td className="py-2 px-3">{String(row.credit ?? "")}</td>
                      <td className="py-2 px-3">{String(row.balance_after ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
