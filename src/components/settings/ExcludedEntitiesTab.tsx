"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type EntityType = "network" | "driver" | "store" | "agent";

interface ExcludedEntity {
  id: string;
  entity_type: EntityType;
  entity_value: string;
  reason: string | null;
  active: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<EntityType, string> = {
  network: "רשת",
  driver:  "נהג",
  store:   "חנות",
  agent:   "סוכן",
};

const TYPE_COLORS: Record<EntityType, string> = {
  network: "bg-blue-100 text-blue-800",
  driver:  "bg-purple-100 text-purple-800",
  store:   "bg-green-100 text-green-800",
  agent:   "bg-amber-100 text-amber-800",
};

export function ExcludedEntitiesTab() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [entities, setEntities]     = useState<ExcludedEntity[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);

  const [newType,   setNewType]   = useState<EntityType>("network");
  const [newValue,  setNewValue]  = useState("");
  const [newReason, setNewReason] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("excluded_entities")
      .select("id, entity_type, entity_value, reason, active, created_at")
      .eq("company_id", companyId)
      .order("entity_type")
      .order("entity_value");
    if (err) { setError(err.message); setLoading(false); return; }
    setEntities((data ?? []) as ExcludedEntity[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    if (!companyId || !newValue.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("excluded_entities")
      .insert({
        company_id:   companyId,
        entity_type:  newType,
        entity_value: newValue.trim(),
        reason:       newReason.trim() || null,
        active:       true,
      });
    if (err) { setError(err.message); setSaving(false); return; }
    setNewValue("");
    setNewReason("");
    setShowForm(false);
    setSaving(false);
    await load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    const supabase = createClient();
    await supabase
      .from("excluded_entities")
      .update({ active: !active, updated_at: new Date().toISOString() })
      .eq("id", id);
    setEntities((prev) => prev.map((e) => e.id === id ? { ...e, active: !active } : e));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את החריג הזה?")) return;
    const supabase = createClient();
    await supabase.from("excluded_entities").delete().eq("id", id);
    setEntities((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
            ישויות המוחרגות מעיבוד קבצי <strong>פירוט מוצרים</strong>.
            שורות שהרשת / הנהג / החנות / הסוכן שלהן מופיעות כאן <strong>לא יועלו לנתונים</strong> ולא יופיעו בשום מסך.
            שימוש טיפוסי: העברות בין מחסנים שמייצרות נתוני כפל.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          הוסף חריג
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-bold text-slate-700">חריג חדש</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">סוג</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as EntityType)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
              >
                {(Object.entries(TYPE_LABELS) as [EntityType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">ערך מדויק (כפי שמופיע בקובץ Excel)</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`שם ה${TYPE_LABELS[newType]}...`}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">סיבה (אופציונלי)</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="למשל: העברות בין מחסנים — נתוני כפל"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white"
            />
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newValue.trim() || saving}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewValue(""); setNewReason(""); setError(null); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {entities.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          אין חריגים מוגדרים עדיין
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">סוג</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">ערך</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 hidden sm:table-cell">סיבה</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">פעיל</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">מחיקה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entities.map((e) => (
                <tr key={e.id} className={e.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${TYPE_COLORS[e.entity_type]}`}>
                      {TYPE_LABELS[e.entity_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{e.entity_value}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{e.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggle(e.id, e.active)}
                      title={e.active ? "לחץ להשבית" : "לחץ להפעיל"}
                      className="inline-flex items-center justify-center hover:opacity-80 transition-opacity"
                    >
                      {e.active
                        ? <Eye    className="w-5 h-5 text-primary-500" />
                        : <EyeOff className="w-5 h-5 text-slate-400" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        שינויים בחריגים ייכנסו לתוקף <strong>בהעלאה הבאה</strong> של קובץ פירוט מוצרים.
        נתונים שכבר הועלו לא מושפעים.
      </p>
    </div>
  );
}
