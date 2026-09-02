"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { useErpJson } from "@/hooks/useErpJson";
import type { MappingCandidate } from "@/lib/erp/solvit/types";

interface MappingPayload {
  entityType: "client" | "product";
  summary: {
    matched: number;
    unmatchedErp: number;
    unmatchedLocal: number;
    duplicates: number;
    totalErp: number;
    totalLocal: number;
    matchPct: number;
  };
  rows: MappingCandidate[];
}

export default function ErpSettingsPage() {
  const status = useErpJson<{
    connected: boolean;
    reason?: string;
    error?: string;
    whoami?: { company: string; company_id: string };
    connection?: { last_catalog_sync_at: string | null };
  }>("/api/erp/status");

  const [entityType, setEntityType] = useState<"client" | "product">("client");
  const mapping = useErpJson<MappingPayload>(`/api/erp/mapping?entity_type=${entityType}`);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [enrich, setEnrich] = useState(false);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMessage("");
    try {
      await fn();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">חיבור Solvit</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          קטלוג + משיכת תעודות משלוח לפירוט מוצרים ונתוני חלוקה. בלילה זה רץ אוטומטית.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3">
          {status.loading ? (
            <p className="text-sm text-gray-500">בודק חיבור...</p>
          ) : status.data?.connected ? (
            <p className="text-sm text-green-700">
              מחובר ל-{status.data.whoami?.company} ({status.data.whoami?.company_id})
            </p>
          ) : (
            <p className="text-sm text-amber-700">
              {status.data?.reason === "no_connection"
                ? "אין חיבור לחברה הנבחרת"
                : status.data?.error || status.error || "לא מחובר"}
            </p>
          )}
          {status.data?.connection?.last_catalog_sync_at && (
            <p className="text-xs text-gray-500">
              סנכרון אחרון: {new Date(status.data.connection.last_catalog_sync_at).toLocaleString("he-IL")}
            </p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
              onClick={() => void status.reload()}
            >
              <RefreshCw className="w-4 h-4" /> בדיקת חיבור
            </button>
            <button
              disabled={!!busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-500 text-white text-sm disabled:opacity-50"
              onClick={() =>
                void run("sync", async () => {
                  const res = await fetch("/api/erp/sync/catalog", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enrich }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "סנכרון נכשל");
                  setMessage(`סונכרנו ${json.clients} לקוחות ו-${json.products} מוצרים`);
                  await mapping.reload();
                  await status.reload();
                })
              }
            >
              {busy === "sync" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              סנכרן קטלוג
            </button>
            <button
              disabled={!!busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm disabled:opacity-50"
              onClick={() =>
                void run("deliveries", async () => {
                  const res = await fetch("/api/erp/sync/deliveries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ days: 90 }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "סנכרון חלוקה נכשל");
                  setMessage(
                    `נמשכו ${json.items} שורות תעודה · ${json.stores} חנויות · ${json.weekly} שבועות (${json.from}–${json.to})`,
                  );
                  await mapping.reload();
                  await status.reload();
                })
              }
            >
              {busy === "deliveries" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              סנכרן חלוקה ופירוט מוצרים
            </button>
            <label className="text-xs text-gray-600 flex items-center gap-2">
              <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
              עדכן נהג/סוכן/עיר בחנויות ממופות שאושרו
            </label>
          </div>
          {message && <p className="text-sm text-gray-700">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded-xl text-sm ${entityType === "client" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                onClick={() => setEntityType("client")}
              >
                לקוחות
              </button>
              <button
                className={`px-3 py-1.5 rounded-xl text-sm ${entityType === "product" ? "bg-gray-900 text-white" : "bg-gray-100"}`}
                onClick={() => setEntityType("product")}
              >
                מוצרים
              </button>
            </div>
            <button
              disabled={!!busy}
              className="px-3 py-2 rounded-xl border text-sm disabled:opacity-50"
              onClick={() =>
                void run("auto", async () => {
                  const res = await fetch("/api/erp/mapping", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entity_type: entityType, auto: true }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || "שמירה נכשלה");
                  setMessage(`אושרו ${json.saved} התאמות לפי מזהה`);
                  await mapping.reload();
                })
              }
            >
              אשר התאמות לפי מזהה
            </button>
          </div>

          {mapping.loading ? (
            <p className="text-sm text-gray-500">טוען מיפוי...</p>
          ) : mapping.error ? (
            <p className="text-sm text-red-600">{mapping.error}</p>
          ) : mapping.data ? (
            <>
              <p className="text-sm text-gray-600">
                התאמה {mapping.data.summary.matchPct}% · {mapping.data.summary.matched} מתוך {mapping.data.summary.totalErp} ב-Solvit
                · לא תואם ב-ERP: {mapping.data.summary.unmatchedErp}
                · רק אצלנו: {mapping.data.summary.unmatchedLocal}
                · כפול: {mapping.data.summary.duplicates}
              </p>
              <div className="overflow-x-auto max-h-[480px]">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b">
                      <th className="py-2 px-3 text-right">סטטוס</th>
                      <th className="py-2 px-3 text-right">Solvit</th>
                      <th className="py-2 px-3 text-right">אצלנו</th>
                      <th className="py-2 px-3 text-right">שיטה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.data.rows.slice(0, 400).map((row, i) => (
                      <tr key={`${row.status}-${row.erp_id}-${row.local_external_id}-${i}`} className="border-b last:border-0">
                        <td className="py-1.5 px-3">{statusLabel(row.status)}</td>
                        <td className="py-1.5 px-3">
                          {row.erp_id ? `${row.erp_id} ${row.erp_name}` : "—"}
                        </td>
                        <td className="py-1.5 px-3">
                          {row.local_external_id != null ? `${row.local_external_id} ${row.local_name ?? ""}` : row.local_name ?? "—"}
                        </td>
                        <td className="py-1.5 px-3">{row.match_method ?? ""}{row.reviewed ? " (אושר)" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function statusLabel(status: MappingCandidate["status"]): string {
  switch (status) {
    case "matched":
      return "תואם";
    case "unmatched_erp":
      return "רק ב-Solvit";
    case "unmatched_local":
      return "רק אצלנו";
    case "duplicate":
      return "כפול";
    default:
      return status;
  }
}
