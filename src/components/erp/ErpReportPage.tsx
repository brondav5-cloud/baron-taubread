"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, Card, CardContent } from "@/components/ui";
import { monthRange, todayIso, useErpJson } from "@/hooks/useErpJson";

interface Props {
  title: string;
  subtitle: string;
  endpoint: string;
  mode: "range" | "asOf" | "activity";
  extraQuery?: Record<string, string>;
}

function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.rows)) return obj.rows as Record<string, unknown>[];
    return [obj];
  }
  return [];
}

export function ErpReportPage({ title, subtitle, endpoint, mode, extraQuery }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [asOf, setAsOf] = useState(todayIso());
  const [inactiveDays, setInactiveDays] = useState(30);

  const url = useMemo(() => {
    const params = new URLSearchParams(extraQuery);
    if (mode === "range") {
      const { from, to } = monthRange(year, month);
      params.set("from_date", from);
      params.set("to_date", to);
      if (endpoint.includes("revenue") || endpoint.includes("payments")) {
        params.set("by_month", "1");
      }
    } else if (mode === "asOf") {
      params.set("as_of_date", asOf);
    } else {
      params.set("inactive_days", String(inactiveDays));
    }
    return `${endpoint}?${params.toString()}`;
  }, [asOf, endpoint, extraQuery, inactiveDays, mode, month, year]);

  const { data, error, loading } = useErpJson<{ data?: unknown; error?: string }>(url);
  const rows = asRows(data?.data);
  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-wrap gap-3 items-end">
        {mode === "range" && (
          <>
            <label className="text-sm">
              שנה
              <input
                type="number"
                className="block mt-1 border rounded-xl px-3 py-2 w-28"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              חודש
              <input
                type="number"
                min={1}
                max={12}
                className="block mt-1 border rounded-xl px-3 py-2 w-20"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </label>
          </>
        )}
        {mode === "asOf" && (
          <label className="text-sm">
            לתאריך
            <input
              type="date"
              className="block mt-1 border rounded-xl px-3 py-2"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </label>
        )}
        {mode === "activity" && (
          <label className="text-sm">
            ימים ללא פעילות
            <input
              type="number"
              min={1}
              className="block mt-1 border rounded-xl px-3 py-2 w-28"
              value={inactiveDays}
              onChange={(e) => setInactiveDays(Number(e.target.value))}
            />
          </label>
        )}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
      </div>
      {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
      <Card>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">אין נתונים לתקופה שנבחרה.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-right text-gray-500 border-b">
                  {columns.map((col) => (
                    <th key={col} className="py-2 px-3 font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {columns.map((col) => (
                      <td key={col} className="py-2 px-3 whitespace-nowrap">
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
