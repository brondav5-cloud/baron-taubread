"use client";

// ============================================================
// ReturnsPolicyTab
// Lets admins configure the "normal returns %" thresholds used
// by the Smart Order recommendation engine.
// Falls back to DEFAULT_POLICY (30/22/16/12%) when no rows exist.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Loader2, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_POLICY } from "@/lib/smartOrderEngine";

interface PolicyRow {
  id:                 string | null;  // null = new unsaved row
  min_monthly_qty:    number;
  max_monthly_qty:    number | null;
  normal_returns_pct: number;
  label:              string;
  sort_order:         number;
}

export function ReturnsPolicyTab() {
  const auth      = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [rows,      setRows]      = useState<PolicyRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [message,   setMessage]   = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const { data } = await createClient()
      .from("returns_policy")
      .select("id,min_monthly_qty,max_monthly_qty,normal_returns_pct,label,sort_order")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true });
    setIsLoading(false);
    if (data && data.length > 0) {
      setRows(
        data.map((r) => ({
          id:                 r.id as string,
          min_monthly_qty:    r.min_monthly_qty as number,
          max_monthly_qty:    r.max_monthly_qty as number | null,
          normal_returns_pct: Number(r.normal_returns_pct),
          label:              (r.label as string) ?? "",
          sort_order:         r.sort_order as number,
        })),
      );
    } else {
      // Seed UI with built-in defaults (not yet saved to DB)
      setRows(
        DEFAULT_POLICY.map((p, i) => ({
          id:                 null,
          min_monthly_qty:    p.minQty,
          max_monthly_qty:    p.maxQty,
          normal_returns_pct: p.normalReturnsPct,
          label:              p.label ?? "",
          sort_order:         i,
        })),
      );
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const update = (idx: number, field: keyof PolicyRow, value: unknown) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: null, min_monthly_qty: 0, max_monthly_qty: null, normal_returns_pct: 20, label: "", sort_order: prev.length },
    ]);

  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!companyId) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();

      // Delete all existing rows for this company, then re-insert
      await supabase.from("returns_policy").delete().eq("company_id", companyId);

      const toInsert = rows.map((r, i) => ({
        company_id:         companyId,
        min_monthly_qty:    r.min_monthly_qty,
        max_monthly_qty:    r.max_monthly_qty,
        normal_returns_pct: r.normal_returns_pct,
        label:              r.label || null,
        sort_order:         i,
      }));

      const { error } = await supabase.from("returns_policy").insert(toInsert);
      if (error) throw new Error(error.message);

      setMessage({ type: "ok", text: "הנורמות נשמרו בהצלחה" });
      await load();
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "שגיאה בשמירה" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>טוען...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          כאן מוגדרים אחוזי החזרות ה<strong>נורמליים</strong> לפי טווח כמות חודשית.
          כאשר חנות חורגת מהנורמה, מנגנון ההזמנה החכם יחשב כמה יחידות להוריד ויחלק אותן בין ימי האספקה.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-200">
              <th className="text-right font-medium py-2 pl-4">תיאור (אופציונלי)</th>
              <th className="text-center font-medium py-2 px-3">כמות מינ׳ / חודש</th>
              <th className="text-center font-medium py-2 px-3">כמות מקס׳ / חודש</th>
              <th className="text-center font-medium py-2 px-3">% חזרות נורמלי</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-2 pl-4">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => update(i, "label", e.target.value)}
                    placeholder="למשל: עד 10 יח׳ / חודש"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={0}
                    value={row.min_monthly_qty}
                    onChange={(e) => update(i, "min_monthly_qty", parseInt(e.target.value) || 0)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number"
                    min={1}
                    value={row.max_monthly_qty ?? ""}
                    placeholder="∞"
                    onChange={(e) =>
                      update(i, "max_monthly_qty", e.target.value === "" ? null : parseInt(e.target.value) || null)
                    }
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-1 justify-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={row.normal_returns_pct}
                      onChange={(e) => update(i, "normal_returns_pct", parseFloat(e.target.value) || 0)}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                    <span className="text-gray-400 text-xs">%</span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  <button
                    onClick={() => removeRow(i)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="מחק שורה"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          הוסף טווח
        </button>

        <button
          onClick={save}
          disabled={isSaving}
          className="flex items-center gap-1.5 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg px-4 py-1.5 font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          שמור נורמות
        </button>

        {message && (
          <span className={`text-sm font-medium ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
