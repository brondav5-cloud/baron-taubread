"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Zap, ChevronRight, Loader2, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import type { BankCategory, CategoryType } from "@/modules/finance/types";

interface CategoryRule {
  id: string;
  category_id: string;
  match_field: string;
  match_type: string;
  match_value: string;
  priority: number;
}

const TYPE_LABELS: Record<CategoryType, { label: string; color: string }> = {
  income:   { label: "הכנסה",   color: "bg-green-100 text-green-700" },
  expense:  { label: "הוצאה",   color: "bg-red-100 text-red-700" },
  transfer: { label: "העברה",   color: "bg-blue-100 text-blue-700" },
  ignore:   { label: "התעלם",   color: "bg-gray-100 text-gray-500" },
};

const MATCH_FIELD_LABELS: Record<string, string> = {
  description: "תיאור",
  details: "פרטים",
  reference: "אסמכתא",
  operation_code: "קוד פעולה",
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  contains: "מכיל",
  starts_with: "מתחיל ב",
  exact: "שווה ל",
  regex: "Regex",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<BankCategory[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<string | null>(null);

  // New category form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("expense");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [newRuleField, setNewRuleField] = useState("description");
  const [saving, setSaving] = useState(false);

  // Inline rule editing state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editField, setEditField] = useState("description");
  const [editType, setEditType] = useState("contains");
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Add rule to existing category
  const [addingRuleCatId, setAddingRuleCatId] = useState<string | null>(null);
  const [addRuleField, setAddRuleField] = useState("description");
  const [addRuleValue, setAddRuleValue] = useState("");
  const [savingAddRule, setSavingAddRule] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/categories");
      const data = await res.json();
      setCategories(data.categories ?? []);
      setRules(data.rules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/finance/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          rule: newRuleValue.trim() ? { match_field: newRuleField, match_type: "contains", match_value: newRuleValue.trim() } : undefined,
        }),
      });
      setNewName("");
      setNewRuleValue("");
      await load();
    } finally {
      setSaving(false);
    }
  }, [newName, newType, newRuleValue, newRuleField, load]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("למחוק קטגוריה זו? כל הכללים והסיווגים המשויכים יימחקו גם כן.")) return;
    await fetch(`/api/finance/categories?id=${id}`, { method: "DELETE" });
    await load();
  }, [load]);

  const startEditRule = useCallback((rule: CategoryRule) => {
    setEditingRuleId(rule.id);
    setEditField(rule.match_field);
    setEditType(rule.match_type);
    setEditValue(rule.match_value);
  }, []);

  const handleSaveRule = useCallback(async () => {
    if (!editingRuleId) return;
    setSavingEdit(true);
    try {
      await fetch("/api/finance/categories/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingRuleId, match_field: editField, match_type: editType, match_value: editValue }),
      });
      setEditingRuleId(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }, [editingRuleId, editField, editType, editValue, load]);

  const handleDeleteRule = useCallback(async (ruleId: string) => {
    await fetch(`/api/finance/categories/rules?id=${ruleId}`, { method: "DELETE" });
    await load();
  }, [load]);

  const handleAddRule = useCallback(async (catId: string) => {
    if (!addRuleValue.trim()) return;
    setSavingAddRule(true);
    try {
      await fetch("/api/finance/categories/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: catId, match_field: addRuleField, match_type: "contains", match_value: addRuleValue.trim() }),
      });
      setAddingRuleCatId(null);
      setAddRuleValue("");
      await load();
    } finally {
      setSavingAddRule(false);
    }
  }, [addRuleField, addRuleValue, load]);

  const handleAutoClassify = useCallback(async () => {
    setClassifying(true);
    setClassifyResult(null);
    try {
      const res = await fetch("/api/finance/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });
      const data = await res.json();
      setClassifyResult(
        data.classified !== undefined
          ? `סווגו ${data.classified} תנועות מתוך ${data.total}`
          : data.message ?? "בוצע"
      );
    } finally {
      setClassifying(false);
    }
  }, []);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/finance" className="text-gray-400 hover:text-gray-600">
          <ChevronRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">קטגוריות סיווג</h1>
          <p className="text-sm text-gray-500 mt-0.5">הגדר קטגוריות וכללים לסיווג אוטומטי של תנועות</p>
        </div>
        <div className="mr-auto flex gap-2">
          <button
            onClick={handleAutoClassify}
            disabled={classifying}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {classifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            סווג אוטומטית
          </button>
        </div>
      </div>

      {classifyResult && (
        <div className="bg-purple-50 text-purple-700 rounded-xl px-4 py-3 text-sm font-medium">
          {classifyResult}
        </div>
      )}

      {/* Add category form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">הוסף קטגוריה חדשה</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם הקטגוריה (למשל: משכורות)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as CategoryType)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {(Object.entries(TYPE_LABELS) as [CategoryType, { label: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={newRuleField}
              onChange={(e) => setNewRuleField(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 w-28 shrink-0"
            >
              {Object.entries(MATCH_FIELD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              value={newRuleValue}
              onChange={(e) => setNewRuleValue(e.target.value)}
              placeholder='כלל אוטומטי — "מכיל..." (אופציונלי)'
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || saving}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            הוסף
          </button>
        </div>
      </div>

      {/* Categories list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center py-12 text-gray-400">
          <p className="font-medium">אין קטגוריות עדיין</p>
          <p className="text-sm mt-1">הוסף קטגוריה ראשונה כדי להתחיל בסיווג</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const catRules = rules.filter((r) => r.category_id === cat.id);
            const typeInfo = TYPE_LABELS[cat.type] ?? TYPE_LABELS["expense"];
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <span className="font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400 mr-auto">
                    {catRules.length > 0 ? `${catRules.length} כלל${catRules.length > 1 ? "ים" : ""}` : "ללא כללים"}
                  </span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {catRules.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {catRules.map((rule) =>
                      editingRuleId === rule.id ? (
                        <div key={rule.id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                          <select value={editField} onChange={(e) => setEditField(e.target.value)}
                            className="text-xs border-0 bg-transparent focus:outline-none">
                            {Object.entries(MATCH_FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <select value={editType} onChange={(e) => setEditType(e.target.value)}
                            className="text-xs border-0 bg-transparent focus:outline-none">
                            {Object.entries(MATCH_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            className="text-xs border border-blue-200 rounded px-1 w-24 focus:outline-none" />
                          <button onClick={handleSaveRule} disabled={savingEdit} className="text-green-600 hover:text-green-700">
                            {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </button>
                          <button onClick={() => setEditingRuleId(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span key={rule.id} className="group flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-md px-2 py-0.5">
                          {MATCH_FIELD_LABELS[rule.match_field] ?? rule.match_field}
                          {" "}{MATCH_TYPE_LABELS[rule.match_type] ?? rule.match_type}{" "}
                          <span className="font-mono font-medium">&ldquo;{rule.match_value}&rdquo;</span>
                          <button onClick={() => startEditRule(rule)} className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDeleteRule(rule.id)} className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    )}
                  </div>
                )}

                {/* Add rule to existing category */}
                {addingRuleCatId === cat.id ? (
                  <div className="mt-2 flex items-center gap-2">
                    <select value={addRuleField} onChange={(e) => setAddRuleField(e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none w-24">
                      {Object.entries(MATCH_FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input value={addRuleValue} onChange={(e) => setAddRuleValue(e.target.value)}
                      placeholder='ערך...' className="border border-gray-200 rounded px-2 py-1 text-xs flex-1 focus:outline-none" />
                    <button onClick={() => handleAddRule(cat.id)} disabled={savingAddRule || !addRuleValue.trim()}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                      {savingAddRule ? <Loader2 className="w-3 h-3 animate-spin" /> : "הוסף"}
                    </button>
                    <button onClick={() => { setAddingRuleCatId(null); setAddRuleValue(""); }}
                      className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingRuleCatId(cat.id); setAddRuleField("description"); setAddRuleValue(""); }}
                    className="mt-1.5 text-xs text-blue-400 hover:text-blue-600 flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> הוסף כלל
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
