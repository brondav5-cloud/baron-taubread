"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronUp, ChevronsUpDown, RefreshCw, Loader2 } from "lucide-react";
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

interface SuppliersTabProps {
  accounts?: DbAccount[];
}

export function SuppliersTab({ accounts = [] }: SuppliersTabProps) {
  const { suppliers, isLoading, error, refetch } = useSuppliers();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [editingClassify, setEditingClassify] = useState<string | null>(null);
  const [classifyCode, setClassifyCode] = useState("");
  const [classifyName, setClassifyName] = useState("");
  type SortKey = "counter_account" | "display_name" | "code" | "account_name" | "names";
  const [sortBy, setSortBy] = useState<SortKey>("display_name");
  const [sortAsc, setSortAsc] = useState(true);

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
  }, [suppliers, search, sortBy, sortAsc]);

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

  const handleClassify = async (supplierId: string) => {
    if (!classifyCode.trim()) return;
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

  const getDisplayCode = (s: SupplierWithDetails) =>
    s.classification?.manual_account_code ?? s.auto_account_code ?? "—";

  const getDisplayName = (s: SupplierWithDetails) =>
    s.classification?.manual_account_name ?? s.auto_account_name ?? null;

  const sectionCounts = useMemo(() => {
    const codeToSection = new Map<string, ParentSection>();
    for (const a of accounts) {
      codeToSection.set(a.code, getParentSectionFromGroupCode(a.latest_group_code || ""));
    }
    const counts: Record<ParentSection, number> = {
      cost_of_goods: 0,
      operating: 0,
      admin: 0,
      finance: 0,
      other: 0,
    };
    for (const s of suppliers) {
      const code = getDisplayCode(s);
      const section = code && code !== "—" ? (codeToSection.get(code) ?? "other") : "other";
      counts[section]++;
    }
    return counts;
  }, [suppliers, accounts]);

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

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {PARENT_SECTION_ORDER.map((sec) => (
              <div
                key={sec}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium"
              >
                <span className="text-gray-500">{PARENT_SECTION_LABELS[sec]}:</span>{" "}
                <span className="text-gray-800 font-bold">{sectionCounts[sec]}</span>
              </div>
            ))}
          </div>
        )}
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
      </div>

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
                  <th className="text-right py-3 px-2 font-semibold min-w-[80px]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const isExpanded = expandedId === s.id;
                  const isEditing = editingClassify === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        key={s.id}
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
                          {isEditing ? (
                            <input
                              value={classifyCode}
                              onChange={(e) => setClassifyCode(e.target.value)}
                              placeholder="מפתח"
                              className="w-20 px-1.5 py-0.5 text-xs border rounded"
                              autoFocus
                            />
                          ) : (
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {getDisplayCode(s)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {isEditing ? (
                            <input
                              value={classifyName}
                              onChange={(e) => setClassifyName(e.target.value)}
                              placeholder="שם חשבון"
                              className="w-28 px-1.5 py-0.5 text-xs border rounded"
                            />
                          ) : (
                            getDisplayName(s) ?? "—"
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {s.names.length}
                        </td>
                        <td className="py-2 px-2">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleClassify(s.id)}
                                className="px-2 py-0.5 text-[10px] bg-primary-600 text-white rounded"
                              >
                                שמור
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClassify(null);
                                  setClassifyCode("");
                                  setClassifyName("");
                                }}
                                className="px-2 py-0.5 text-[10px] border rounded"
                              >
                                ביטול
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingClassify(s.id);
                                setClassifyCode(getDisplayCode(s) === "—" ? "" : getDisplayCode(s));
                                setClassifyName(getDisplayName(s) ?? "");
                              }}
                              className="px-2 py-0.5 text-[10px] border rounded hover:bg-gray-100"
                            >
                              סווג
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && s.names.length > 0 && (
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <td colSpan={7} className="py-2 px-4">
                            <div className="text-[11px] space-y-1 pr-8">
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
          {suppliers.length} ספקים · סיווג אוטומטי מתנועות הוצאה
        </div>
      </div>
    </div>
  );
}
