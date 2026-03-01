"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronUp, ChevronsUpDown, RefreshCw, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import { useSuppliers, type SupplierWithDetails } from "@/hooks/useSuppliers";
import type { DbAccount } from "@/types/accounting";
import { PARENT_SECTION_LABELS, PARENT_SECTION_ORDER, type ParentSection } from "@/types/accounting";

function getParentSectionFromGroupCode(gc: string): ParentSection {
  const c = (gc || "").trim()[0];
  if (c === "7") return "cost_of_goods";
  if (c === "8") return "operating";
  if (c === "9") return "admin";
  return "other";
}

const SECTION_BADGE_COLORS: Record<ParentSection, string> = {
  cost_of_goods: "bg-orange-100 text-orange-700 border-orange-200",
  operating:     "bg-blue-100 text-blue-700 border-blue-200",
  admin:         "bg-green-100 text-green-700 border-green-200",
  finance:       "bg-purple-100 text-purple-700 border-purple-200",
  other:         "bg-gray-100 text-gray-600 border-gray-200",
};

interface SuppliersTabProps {
  accounts?: DbAccount[];
}

export function SuppliersTab({ accounts = [] }: SuppliersTabProps) {
  const { suppliers, isLoading, error, refetch } = useSuppliers();
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState<ParentSection | "all" | "unclassified">("all");
  const [filterCode, setFilterCode] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [editingClassify, setEditingClassify] = useState<string | null>(null);
  const [classifyCode, setClassifyCode] = useState("");
  const [classifyName, setClassifyName] = useState("");
  const [saving, setSaving] = useState(false);
  type SortKey = "counter_account" | "display_name" | "code" | "account_name" | "names";
  const [sortBy, setSortBy] = useState<SortKey>("display_name");
  const [sortAsc, setSortAsc] = useState(true);

  const codeToSection = useMemo(() => {
    const m = new Map<string, ParentSection>();
    for (const a of accounts) {
      m.set(a.code, getParentSectionFromGroupCode(a.latest_group_code || ""));
    }
    return m;
  }, [accounts]);

  const getDisplayCode = (s: SupplierWithDetails) =>
    s.classification?.manual_account_code ?? s.auto_account_code ?? "—";

  const getDisplayName = (s: SupplierWithDetails) =>
    s.classification?.manual_account_name ?? s.auto_account_name ?? null;

  const isManuallyClassified = (s: SupplierWithDetails) =>
    !!s.classification?.manual_account_code;

  // All unique account codes that appear in the supplier list (sorted)
  const uniqueCodes = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers) {
      const c = getDisplayCode(s);
      if (c && c !== "—") set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [suppliers]);

  // Name of each code (first account name found)
  const codeToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of suppliers) {
      const c = getDisplayCode(s);
      const n = getDisplayName(s);
      if (c && c !== "—" && n && !m.has(c)) m.set(c, n);
    }
    return m;
  }, [suppliers]);

  const filtered = useMemo(() => {
    let list = suppliers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.counter_account.toLowerCase().includes(q) ||
          s.display_name.toLowerCase().includes(q),
      );
    }
    if (filterCode) {
      list = list.filter((s) => getDisplayCode(s) === filterCode);
    } else if (filterSection !== "all") {
      list = list.filter((s) => {
        const code = s.classification?.manual_account_code ?? s.auto_account_code ?? "";
        if (filterSection === "unclassified") return !code;
        if (!code) return false;
        const sec = codeToSection.get(code) ?? getParentSectionFromGroupCode(code);
        return sec === filterSection;
      });
    }
    const code = (s: SupplierWithDetails) =>
      s.classification?.manual_account_code ?? s.auto_account_code ?? "";
    const name = (s: SupplierWithDetails) =>
      s.classification?.manual_account_name ?? s.auto_account_name ?? "";
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "counter_account") cmp = a.counter_account.localeCompare(b.counter_account, undefined, { numeric: true });
      else if (sortBy === "display_name") cmp = a.display_name.localeCompare(b.display_name, "he");
      else if (sortBy === "code") cmp = code(a).localeCompare(code(b), undefined, { numeric: true });
      else if (sortBy === "account_name") cmp = name(a).localeCompare(name(b), "he");
      else if (sortBy === "names") cmp = a.names.length - b.names.length;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [suppliers, search, filterSection, filterCode, sortBy, sortAsc, codeToSection]);

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const res = await fetch("/api/accounting/suppliers/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה בבניית ספקים");
    } finally {
      setBuilding(false);
    }
  };

  const startClassify = (s: SupplierWithDetails) => {
    setEditingClassify(s.id);
    const code = getDisplayCode(s);
    setClassifyCode(code === "—" ? "" : code);
    setClassifyName(getDisplayName(s) ?? "");
  };

  const handleClassify = async (supplierId: string) => {
    if (!classifyCode.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/accounting/suppliers/${supplierId}/classify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manual_account_code: classifyCode.trim(),
          manual_account_name: classifyName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה");
      }
      setEditingClassify(null);
      setClassifyCode("");
      setClassifyName("");
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  const handleClearClassify = async (supplierId: string) => {
    if (!confirm("האם לנקות את הסיווג הידני? הסיווג האוטומטי יחזור להיות פעיל.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/accounting/suppliers/${supplierId}/classify`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה");
      }
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  const handleReassign = async (nameId: string, counter_account_override: string | null) => {
    try {
      const res = await fetch(`/api/accounting/supplier-names/${nameId}/reassign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counter_account_override }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה");
      }
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    }
  };

  const sectionCounts = useMemo(() => {
    const counts: Record<ParentSection | "unclassified", number> = {
      cost_of_goods: 0, operating: 0, admin: 0, finance: 0, other: 0, unclassified: 0,
    };
    for (const s of suppliers) {
      const code = getDisplayCode(s);
      if (!code || code === "—") {
        counts.unclassified++;
      } else {
        const section = codeToSection.get(code) ?? getParentSectionFromGroupCode(code);
        counts[section]++;
      }
    }
    return counts;
  }, [suppliers, codeToSection]);

  // How many suppliers per code
  const codeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of suppliers) {
      const c = getDisplayCode(s);
      if (c && c !== "—") m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [suppliers]);

  const toggleSort = (key: SortKey) => {
    setSortBy(key);
    setSortAsc((prev) => (sortBy === key ? !prev : true));
  };

  const SortTh = ({ label, sortKey, className = "" }: { label: string; sortKey: SortKey; className?: string }) => (
    <th
      className={clsx("text-right py-3 px-4 font-semibold cursor-pointer hover:bg-slate-600 select-none", className)}
      onClick={() => toggleSort(sortKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {sortBy === sortKey ? (
          sortAsc ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
        )}
      </span>
    </th>
  );

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  const activeFilterCode = filterCode;

  return (
    <div className="space-y-4">
      {/* ── Section filter chips ── */}
      {accounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {PARENT_SECTION_ORDER.map((sec) => (
            <button
              key={sec}
              onClick={() => { setFilterSection(filterSection === sec && !filterCode ? "all" : sec); setFilterCode(null); }}
              className={clsx(
                "px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
                filterSection === sec && !filterCode
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700",
              )}
            >
              <span className="text-gray-500">{PARENT_SECTION_LABELS[sec]}:</span>{" "}
              <span className="font-bold">{sectionCounts[sec]}</span>
            </button>
          ))}
          <button
            onClick={() => { setFilterSection(filterSection === "unclassified" && !filterCode ? "all" : "unclassified"); setFilterCode(null); }}
            className={clsx(
              "px-3 py-2 rounded-xl border text-sm font-medium transition-colors",
              filterSection === "unclassified" && !filterCode
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700",
            )}
          >
            <span className="text-gray-500">ללא סיווג:</span>{" "}
            <span className="font-bold">{sectionCounts.unclassified}</span>
          </button>
        </div>
      )}

      {/* ── Group-code chips (collapsible list) ── */}
      {uniqueCodes.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 space-y-1.5">
          <p className="text-[11px] text-gray-500 font-medium">סינון לפי קוד קבוצה — לחץ לסינון, לחץ שוב לביטול:</p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueCodes.map((code) => {
              const sec = codeToSection.get(code) ?? getParentSectionFromGroupCode(code);
              const colorClass = SECTION_BADGE_COLORS[sec];
              const isActive = activeFilterCode === code;
              const count = codeCounts.get(code) ?? 0;
              const name = codeToName.get(code);
              return (
                <button
                  key={code}
                  onClick={() => { setFilterCode(isActive ? null : code); setFilterSection("all"); }}
                  className={clsx(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium transition-all",
                    isActive
                      ? "ring-2 ring-primary-400 ring-offset-1 " + colorClass
                      : colorClass + " hover:brightness-95",
                  )}
                  title={name ?? code}
                >
                  <code className="font-mono">{code}</code>
                  <span className="opacity-70">({count})</span>
                  {isActive && <X className="w-2.5 h-2.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active filter banner */}
      {activeFilterCode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-700">
          <span>מסנן לפי קוד: <strong>{activeFilterCode}</strong></span>
          {codeToName.get(activeFilterCode) && (
            <span className="text-primary-500">— {codeToName.get(activeFilterCode)}</span>
          )}
          <span className="text-primary-400">({filtered.length} ספקים)</span>
          <button onClick={() => setFilterCode(null)} className="mr-auto text-primary-600 hover:text-primary-800 flex items-center gap-1">
            <X className="w-3 h-3" /> נקה סינון
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש ח״ן / שם..."
              className="pr-9 pl-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300 w-52"
            />
          </div>
          {!activeFilterCode && (
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value as typeof filterSection)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-300"
            >
              <option value="all">כל הסעיפים</option>
              <option value="unclassified">ללא סיווג</option>
              {PARENT_SECTION_ORDER.map((sec) => (
                <option key={sec} value={sec}>{PARENT_SECTION_LABELS[sec]}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => void refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            רענן
          </button>
          <button
            onClick={() => void handleBuild()}
            disabled={building || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
          >
            {building ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>מעבד... (עשוי לקחת דקה)</span>
              </>
            ) : (
              "בנה ספקים מחדש"
            )}
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {suppliers.length === 0
              ? "אין ספקים. העלה קובץ כרטסת והפעל ״בנה ספקים מחדש״."
              : "לא נמצאו ספקים תואמים לחיפוש."}
          </div>
        ) : (
          <div className="overflow-x-auto" dir="rtl">
            <table className="text-[11px] border-collapse w-full">
              <thead>
                <tr className="bg-gradient-to-l from-slate-700 to-slate-800 text-white">
                  <th className="w-8 py-2" />
                  <SortTh label="ח״ן" sortKey="counter_account" className="min-w-[100px]" />
                  <SortTh label="שם תצוגה" sortKey="display_name" className="min-w-[180px]" />
                  <SortTh label="מפתח סיווג" sortKey="code" className="min-w-[90px]" />
                  <SortTh label="שם חשבון" sortKey="account_name" className="min-w-[100px]" />
                  <SortTh label="שמות" sortKey="names" className="min-w-[50px] text-center" />
                  <th className="text-right py-3 px-2 font-semibold min-w-[110px]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const isExpanded = expandedId === s.id;
                  const isEditing = editingClassify === s.id;
                  const displayCode = getDisplayCode(s);
                  const displayName = getDisplayName(s);
                  const isManual = isManuallyClassified(s);
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        className={clsx(
                          "border-b border-gray-50 hover:bg-gray-50/60 transition-colors",
                          isExpanded && "bg-gray-50/80",
                        )}
                      >
                        <td className="py-1 px-1">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
                            className="p-1 rounded hover:bg-gray-200"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronLeft className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-4">
                          <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            {s.counter_account}
                          </code>
                        </td>
                        <td className="py-2 px-4 font-medium text-gray-800">{s.display_name}</td>
                        <td className="py-2 px-3">
                          <span className={clsx(
                            "font-mono px-1.5 py-0.5 rounded text-[10px]",
                            isManual
                              ? "bg-primary-100 text-primary-700 border border-primary-200"
                              : "bg-gray-100 text-gray-600",
                          )}>
                            {displayCode}
                            {isManual && <span className="mr-1 text-primary-400">✎</span>}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          <span className={clsx(isManual && "text-primary-700 font-medium")}>
                            {displayName ?? "—"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          {s.names.length}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => startClassify(s)}
                              className={clsx(
                                "px-2 py-0.5 text-[10px] border rounded transition-colors",
                                isEditing
                                  ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
                                  : "hover:bg-gray-100 text-gray-700",
                              )}
                              title="שנה קוד קבוצה"
                            >
                              {isEditing ? "↑ סוגר" : "שנה קוד"}
                            </button>
                            {isManual && !isEditing && (
                              <button
                                onClick={() => void handleClearClassify(s.id)}
                                disabled={saving}
                                className="px-1.5 py-0.5 text-[10px] border border-red-200 text-red-500 rounded hover:bg-red-50"
                                title="נקה סיווג ידני — חזור לאוטומטי"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Classify panel (open below the row) ── */}
                      {isEditing && (
                        <tr className="bg-primary-50/60 border-b border-primary-100">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="space-y-3 max-w-lg">
                              <p className="text-xs font-semibold text-primary-800">
                                שינוי קוד קבוצה עבור: <span className="text-gray-700">{s.display_name}</span>
                              </p>

                              {/* Step 1 — pick from existing codes */}
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">
                                  בחר קוד קיים:
                                </label>
                                <select
                                  value={uniqueCodes.includes(classifyCode) ? classifyCode : ""}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setClassifyCode(e.target.value);
                                      setClassifyName(codeToName.get(e.target.value) ?? "");
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-300"
                                >
                                  <option value="">— בחר מרשימה —</option>
                                  {uniqueCodes.map((c) => (
                                    <option key={c} value={c}>
                                      {c}{codeToName.get(c) ? ` — ${codeToName.get(c)}` : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Divider */}
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <div className="flex-1 border-t border-gray-200" />
                                <span>או הכנס קוד חדש</span>
                                <div className="flex-1 border-t border-gray-200" />
                              </div>

                              {/* Step 2 — free input */}
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="block text-[10px] text-gray-500 mb-1">קוד קבוצה:</label>
                                  <input
                                    value={classifyCode}
                                    onChange={(e) => setClassifyCode(e.target.value)}
                                    placeholder="לדוגמה: 700"
                                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-300"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") void handleClassify(s.id);
                                      if (e.key === "Escape") { setEditingClassify(null); setClassifyCode(""); setClassifyName(""); }
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] text-gray-500 mb-1">שם חשבון (אופציונלי):</label>
                                  <input
                                    value={classifyName}
                                    onChange={(e) => setClassifyName(e.target.value)}
                                    placeholder="לדוגמה: קניות חומרי גלם"
                                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-300"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => void handleClassify(s.id)}
                                  disabled={saving || !classifyCode.trim()}
                                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                >
                                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  שמור שינוי
                                </button>
                                <button
                                  onClick={() => { setEditingClassify(null); setClassifyCode(""); setClassifyName(""); }}
                                  className="px-4 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
                                >
                                  ביטול
                                </button>
                                {classifyCode && (
                                  <span className="text-[10px] text-gray-400 self-center">
                                    קוד נבחר: <strong className="text-gray-600">{classifyCode}</strong>
                                    {classifyName && ` — ${classifyName}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExpanded && !isEditing && s.names.length > 0 && (
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <td colSpan={7} className="py-2 px-4">
                            <div className="text-[11px] space-y-1 pr-8">
                              <p className="text-gray-400 text-[10px] mb-1">שמות שנראו בתנועות:</p>
                              {s.names.map((n) => (
                                <div key={n.id} className="flex items-center justify-between gap-2">
                                  <span>
                                    {n.name}
                                    {n.occurrence_count > 1 && (
                                      <span className="text-gray-400 mr-1">×{n.occurrence_count}</span>
                                    )}
                                  </span>
                                  {n.counter_account_override ? (
                                    <span className="text-amber-600">
                                      ← ח״ן {n.counter_account_override}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const v = prompt("הזן ח״ן נגדי להעברה (או ריק לביטול):");
                                        void handleReassign(n.id, v?.trim() || null);
                                      }}
                                      className="text-[10px] text-primary-600 hover:underline"
                                    >
                                      העבר ל-H אחר
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length === suppliers.length
            ? `${suppliers.length} ספקים`
            : `${filtered.length} מתוך ${suppliers.length} ספקים`}
          {" · סיווג אוטומטי מתנועות הוצאה"}
          {activeFilterCode && ` · מסנן: ${activeFilterCode}`}
        </div>
      </div>
    </div>
  );
}
