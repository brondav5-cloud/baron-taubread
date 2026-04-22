"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type { PnlCategoryLine } from "@/app/api/finance/pnl/route";

interface Props {
  open: boolean;
  lines: PnlCategoryLine[];
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

interface CategoryRow {
  id: string;
  name: string;
  type: "income" | "expense" | "transfer" | "ignore";
}

interface RuleRow {
  id: string;
  category_id: string;
  match_field: "description" | "details" | "reference" | "operation_code" | "supplier_name";
  match_type: "contains" | "starts_with" | "exact" | "regex";
  match_value: string;
}

const TARGETS = [
  { key: "checks", name: "הכנסות משיקים" },
  { key: "transfers", name: "הכנסות מהעברות" },
  { key: "cash", name: "הכנסות מזומן" },
  { key: "other", name: "הכנסות שונות" },
] as const;

async function fetchCategoriesAndRules(): Promise<{ categories: CategoryRow[]; rules: RuleRow[] }> {
  const res = await fetch("/api/finance/categories");
  if (!res.ok) throw new Error("שגיאה בטעינת קטגוריות");
  const data = await res.json() as { categories?: CategoryRow[]; rules?: RuleRow[] };
  return { categories: data.categories ?? [], rules: data.rules ?? [] };
}

async function createIncomeCategory(name: string) {
  const res = await fetch("/api/finance/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type: "income" }),
  });
  if (!res.ok) throw new Error(`שגיאה ביצירת קטגוריה: ${name}`);
}

export default function IncomeMappingModal({ open, lines, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [matchField, setMatchField] = useState<RuleRow["match_field"]>("description");
  const [matchType, setMatchType] = useState<RuleRow["match_type"]>("contains");
  const [matchValue, setMatchValue] = useState("");
  const [applyNow, setApplyNow] = useState(true);
  const [includeClassified, setIncludeClassified] = useState(false);

  const incomeCategories = useMemo(
    () => categories.filter((cat) => cat.type === "income"),
    [categories],
  );

  const currentTotals = useMemo(() => {
    const byId = new Map(lines.map((line) => [line.category_id, line.total]));
    return incomeCategories.map((cat) => ({
      ...cat,
      total: byId.get(cat.id) ?? 0,
    }));
  }, [incomeCategories, lines]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const initial = await fetchCategoriesAndRules();
      const existingIncomeNames = new Set(
        initial.categories
          .filter((cat) => cat.type === "income")
          .map((cat) => cat.name.trim()),
      );

      const missing = TARGETS.filter((target) => !existingIncomeNames.has(target.name));
      if (missing.length > 0) {
        for (const target of missing) {
          await createIncomeCategory(target.name);
        }
      }

      const refreshed = missing.length > 0 ? await fetchCategoriesAndRules() : initial;
      setCategories(refreshed.categories);
      setRules(refreshed.rules);

      const defaultTarget = refreshed.categories.find((cat) => cat.type === "income" && cat.name === TARGETS[0].name);
      if (defaultTarget) setTargetCategoryId(defaultTarget.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת חלון שיוך הכנסות");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  async function createRule() {
    if (!targetCategoryId || !matchValue.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const createRes = await fetch("/api/finance/categories/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: targetCategoryId,
          match_field: matchField,
          match_type: matchType,
          match_value: matchValue.trim(),
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "שגיאה ביצירת כלל");
      }

      if (applyNow) {
        const applyRes = await fetch("/api/finance/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "apply_single_rule",
            include_classified: includeClassified,
            rule: {
              category_id: targetCategoryId,
              match_field: matchField,
              match_type: matchType,
              match_value: matchValue.trim(),
            },
          }),
        });
        if (!applyRes.ok) {
          const body = await applyRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "הכלל נשמר אבל ההחלה נכשלה");
        }
      }

      setMatchValue("");
      await load();
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירת כלל");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(ruleId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/categories/rules?id=${ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקת כלל");
      await load();
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת כלל");
    } finally {
      setSaving(false);
    }
  }

  const rulesByCategory = useMemo(() => {
    const map = new Map<string, RuleRow[]>();
    for (const rule of rules) {
      const list = map.get(rule.category_id) ?? [];
      list.push(rule);
      map.set(rule.category_id, list);
    }
    return map;
  }, [rules]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3" dir="rtl">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">שיוך הכנסות לסעיפים ניהוליים</h2>
            <p className="text-xs text-gray-500 mt-1">הגדר כללים שימפו תנועות להכנסות משיקים / העברות / מזומן / שונות.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              טוען חלון שיוך...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                {TARGETS.map((target) => {
                  const cat = currentTotals.find((c) => c.name === target.name);
                  return (
                    <div key={target.key} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">{target.name}</p>
                      <p className="text-lg font-bold text-gray-800">
                        ₪{Math.round(cat?.total ?? 0).toLocaleString("he-IL")}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
                <p className="text-xs font-medium text-blue-800">הוסף כלל שיוך חדש</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={targetCategoryId}
                    onChange={(e) => setTargetCategoryId(e.target.value)}
                    className="border border-blue-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    {incomeCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    value={matchField}
                    onChange={(e) => setMatchField(e.target.value as RuleRow["match_field"])}
                    className="border border-blue-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="description">שדה: תיאור</option>
                    <option value="details">שדה: פרטים</option>
                    <option value="reference">שדה: אסמכתא</option>
                    <option value="supplier_name">שדה: ספק</option>
                    <option value="operation_code">שדה: קוד פעולה</option>
                  </select>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value as RuleRow["match_type"])}
                    className="border border-blue-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="contains">מכיל</option>
                    <option value="starts_with">מתחיל ב</option>
                    <option value="exact">שווה בדיוק</option>
                    <option value="regex">Regex</option>
                  </select>
                  <input
                    value={matchValue}
                    onChange={(e) => setMatchValue(e.target.value)}
                    placeholder="ערך כלל..."
                    className="border border-blue-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <label className="inline-flex items-center gap-1.5 text-blue-700">
                    <input type="checkbox" checked={applyNow} onChange={(e) => setApplyNow(e.target.checked)} />
                    החל עכשיו על נתונים קיימים
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-blue-700">
                    <input
                      type="checkbox"
                      checked={includeClassified}
                      onChange={(e) => setIncludeClassified(e.target.checked)}
                      disabled={!applyNow}
                    />
                    כולל תנועות שכבר מסווגות
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => { void createRule(); }}
                  disabled={saving || !targetCategoryId || !matchValue.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  הוסף כלל
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">כללים קיימים לפי סעיף הכנסה</p>
                {incomeCategories.map((cat) => {
                  const catRules = rulesByCategory.get(cat.id) ?? [];
                  return (
                    <div key={cat.id} className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 text-sm font-semibold text-gray-700">{cat.name}</div>
                      {catRules.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-400">אין כללים</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {catRules.map((rule) => (
                            <div key={rule.id} className="px-3 py-2 text-xs flex items-center gap-2">
                              <span className="text-gray-500">{rule.match_field}</span>
                              <span className="text-gray-400">{rule.match_type}</span>
                              <span className="font-mono text-gray-700 flex-1 truncate">{rule.match_value}</span>
                              <button
                                onClick={() => { void deleteRule(rule.id); }}
                                className="text-gray-400 hover:text-red-600"
                                title="מחק כלל"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
