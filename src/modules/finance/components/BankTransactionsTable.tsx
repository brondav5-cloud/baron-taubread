"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, X, Filter, Pencil, Eye, EyeOff,
} from "lucide-react";
import type { CategoryType } from "../types";

function MergeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/><path d="M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  );
}
import type { BankTransaction, BankCategory, SourceBank } from "../types";
import type { SortBy, SortDir } from "../hooks/useBankTransactions";

const TYPE_LABELS: Record<string, string> = {
  income: "הכנסה",
  expense: "הוצאה",
  transfer: "העברה",
  ignore: "התעלם",
};

type RuleField = "description" | "details" | "operation_code" | "supplier_name";

function calcDropdownPos(btn: HTMLButtonElement, dropW: number) {
  const rect = btn.getBoundingClientRect();
  const spaceRight = window.innerWidth - rect.right;
  // Prefer right-aligned; if not enough room on left, push in from left edge
  const right = Math.max(8, spaceRight);
  // If the dropdown would overflow the left edge, clamp it
  const effectiveLeft = window.innerWidth - right - dropW;
  const clampedRight = effectiveLeft < 8 ? window.innerWidth - dropW - 8 : right;
  return { top: rect.bottom + 4, right: clampedRight, width: dropW };
}

// ── Inline category selector ──────────────────────────────────────────────────
function InlineCategorySelect({
  tx,
  categories,
  catMap,
  onClassify,
  onCategoryAdded,
}: {
  tx: BankTransaction;
  categories: BankCategory[];
  catMap: Map<string, BankCategory>;
  onClassify?: (txId: string, catId: string | null) => Promise<void>;
  onCategoryAdded?: (cat: BankCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("expense");
  const [saving, setSaving] = useState(false);
  const [localCatId, setLocalCatId] = useState<string | undefined>(tx.category_id);

  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [ruleField, setRuleField] = useState<RuleField>(tx.supplier_name ? "supplier_name" : "description");
  const [savingRule, setSavingRule] = useState(false);

  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const [ruleStyle, setRuleStyle] = useState<React.CSSProperties>({});

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalCatId(tx.category_id); }, [tx.category_id]);

  // Outside click closes both panels
  useEffect(() => {
    if (!open && !showRulePrompt) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        buttonRef.current?.contains(t) ||
        dropRef.current?.contains(t) ||
        ruleRef.current?.contains(t)
      ) return;
      setOpen(false);
      setShowRulePrompt(false);
      setAddMode(false);
      setSearch("");
      setNewName("");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, showRulePrompt]);

  const cat = localCatId ? catMap.get(localCatId) : undefined;

  const ruleValue = (): string => {
    if (ruleField === "supplier_name") return tx.supplier_name ?? "";
    if (ruleField === "details") return tx.details ?? "";
    if (ruleField === "operation_code") return tx.operation_code ?? "";
    return tx.description ?? "";
  };

  const handleOpen = () => {
    if (saving) return;
    if (open) { setOpen(false); return; }
    if (buttonRef.current) setDropStyle(calcDropdownPos(buttonRef.current, 224));
    setSearch("");
    setShowRulePrompt(false);
    setOpen(true);
  };

  const handleSelect = async (catId: string | null) => {
    setOpen(false);
    setSearch("");
    setAddMode(false);
    const prevId = localCatId;
    setLocalCatId(catId ?? undefined);
    setSaving(true);
    try {
      await onClassify?.(tx.id, catId);
      if (catId && buttonRef.current) {
        setRuleStyle(calcDropdownPos(buttonRef.current, 248));
        setShowRulePrompt(true);
      }
    } catch {
      setLocalCatId(prevId);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async () => {
    if (!localCatId || !ruleValue()) return;
    setSavingRule(true);
    try {
      await fetch("/api/finance/categories/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: localCatId,
          match_field: ruleField,
          match_type: "contains",
          match_value: ruleValue(),
        }),
      });
    } finally {
      setSavingRule(false);
      setShowRulePrompt(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      const data = await res.json();
      if (data.ok && data.id) {
        const newCat: BankCategory = { id: data.id, company_id: tx.company_id, name: newName.trim(), type: newType, sort_order: 0 };
        onCategoryAdded?.(newCat);
        setLocalCatId(data.id);
        await onClassify?.(tx.id, data.id);
        setOpen(false);
        setAddMode(false);
        setNewName("");
        setSearch("");
        if (buttonRef.current) {
          setRuleStyle(calcDropdownPos(buttonRef.current, 248));
          setShowRulePrompt(true);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const typeGroups: CategoryType[] = ["income", "expense", "transfer", "ignore"];

  // Smart search: filter by name
  const searchLower = search.toLowerCase();
  const filteredCategories = searchLower
    ? categories.filter((c) => c.name.toLowerCase().includes(searchLower))
    : categories;

  const hasResults = filteredCategories.length > 0;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {/* ── Trigger badge ── */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
          cat
            ? `${CAT_TYPE_COLOR[cat.type] ?? "bg-gray-100 text-gray-500"} border-transparent hover:opacity-80`
            : "text-gray-400 border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-600 bg-transparent"
        } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
      >
        {saving ? (
          <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
        ) : cat ? (
          cat.name
        ) : (
          <span className="text-[10px] font-medium">+ סיווג</span>
        )}
      </button>

      {/* ── Category picker — rendered via portal so it escapes table overflow ── */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropRef}
          style={{ position: "fixed", ...dropStyle, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
          dir="rtl"
        >
          {/* Search input */}
          <div className="px-2 pt-2 pb-1">
            <div className="relative">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setSearch(""); }
                  if (e.key === "Enter" && filteredCategories.length === 1 && filteredCategories[0]) {
                    handleSelect(filteredCategories[0].id);
                  }
                }}
                placeholder="חפש קטגוריה..."
                className="w-full border border-gray-200 rounded-lg pr-6 pl-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Remove option */}
            {cat && !search && (
              <>
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full text-right px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  הסר סיווג
                </button>
                <div className="border-t border-gray-100" />
              </>
            )}

            {/* No results */}
            {!hasResults && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">לא נמצאו קטגוריות</p>
            )}

            {/* Categories */}
            {!searchLower
              ? typeGroups.map((type) => {
                  const cats = filteredCategories.filter((c) => c.type === type);
                  if (!cats.length) return null;
                  return (
                    <div key={type}>
                      <div className="px-3 pt-1.5 pb-0.5 text-[9px] uppercase font-bold tracking-wide text-gray-400 sticky top-0 bg-white">
                        {TYPE_LABELS[type]}
                      </div>
                      {cats.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelect(c.id)}
                          className={`w-full text-right px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${
                            c.id === localCatId ? "font-semibold text-blue-600 bg-blue-50/60" : "text-gray-700"
                          }`}
                        >
                          <span>{c.name}</span>
                          {c.id === localCatId && <span className="text-blue-500 text-[10px]">✓</span>}
                        </button>
                      ))}
                    </div>
                  );
                })
              : filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    className={`w-full text-right px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${
                      c.id === localCatId ? "font-semibold text-blue-600 bg-blue-50/60" : "text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`shrink-0 text-[9px] px-1 rounded font-medium ${CAT_TYPE_COLOR[c.type] ?? "bg-gray-100 text-gray-500"}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    {c.id === localCatId && <span className="text-blue-500 text-[10px] shrink-0">✓</span>}
                  </button>
                ))
            }
          </div>

          {/* Add new category */}
          <div className="border-t border-gray-100">
            {!addMode ? (
              <button
                onClick={() => setAddMode(true)}
                className="w-full text-right px-3 py-2 text-xs text-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-1.5"
              >
                <span className="font-bold text-sm leading-none">+</span>
                <span>הוסף קטגוריה חדשה</span>
              </button>
            ) : (
              <div className="px-2 py-2 space-y-1.5">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCategory();
                    if (e.key === "Escape") { setAddMode(false); setNewName(""); }
                  }}
                  placeholder="שם הקטגוריה"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CategoryType)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="income">הכנסה</option>
                  <option value="expense">הוצאה</option>
                  <option value="transfer">העברה</option>
                  <option value="ignore">התעלם</option>
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={handleCreateCategory}
                    disabled={saving || !newName.trim()}
                    className="flex-1 text-xs bg-blue-500 text-white rounded-lg px-2 py-1.5 hover:bg-blue-600 disabled:opacity-40 transition-colors font-medium"
                  >
                    {saving ? "..." : "צור"}
                  </button>
                  <button
                    onClick={() => { setAddMode(false); setNewName(""); }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 text-gray-500 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── Rule prompt — also via portal ── */}
      {showRulePrompt && localCatId && typeof document !== "undefined" && createPortal(
        <div
          ref={ruleRef}
          style={{ position: "fixed", ...ruleStyle, zIndex: 9999 }}
          className="bg-purple-50 border border-purple-200 rounded-xl shadow-2xl p-3 space-y-2"
          dir="rtl"
        >
          <p className="text-xs font-semibold text-purple-800">צור כלל אוטומטי לתנועות דומות?</p>
          <div className="flex items-center gap-1.5">
            <select
              value={ruleField}
              onChange={(e) => setRuleField(e.target.value as RuleField)}
              className="border border-purple-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-400 shrink-0"
            >
              {tx.supplier_name && <option value="supplier_name">שם ספק</option>}
              <option value="description">תיאור</option>
              {tx.details && <option value="details">פרטים</option>}
              {tx.operation_code && <option value="operation_code">קוד פעולה</option>}
            </select>
            <span className="text-[10px] text-purple-600 truncate font-mono min-w-0 max-w-[120px]">
              &quot;{ruleValue()}&quot;
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateRule}
              disabled={savingRule || !ruleValue()}
              className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
            >
              {savingRule && <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
              צור כלל
            </button>
            <button
              onClick={() => setShowRulePrompt(false)}
              className="text-xs text-purple-400 hover:text-purple-600 transition-colors"
            >
              דלג
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const BANK_LABELS: Record<SourceBank, { label: string; color: string }> = {
  leumi: { label: "לאומי", color: "bg-blue-100 text-blue-700" },
  hapoalim: { label: "הפועלים", color: "bg-orange-100 text-orange-700" },
  mizrahi: { label: "מזרחי", color: "bg-yellow-100 text-yellow-700" },
};

const CAT_TYPE_COLOR: Record<string, string> = {
  income:   "bg-green-100 text-green-700",
  expense:  "bg-red-100 text-red-700",
  transfer: "bg-blue-100 text-blue-700",
  ignore:   "bg-gray-100 text-gray-400",
};

function fmt(n: number) {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function isMergedMaster(tx: BankTransaction) {
  return tx.notes?.startsWith("[מיוזג מ-") ?? false;
}

interface Props {
  transactions: BankTransaction[];
  categories?: BankCategory[];
  isLoading: boolean;
  sortBy?: SortBy;
  sortDir?: SortDir;
  onSort?: (col: SortBy) => void;
  onRowClick?: (tx: BankTransaction) => void;
  onEditClick?: (tx: BankTransaction) => void;
  onMergeSelected?: (txs: BankTransaction[]) => void;
  onUnmergeClick?: (tx: BankTransaction) => void;
  splitCounts?: Map<string, number>;
  searchFilter?: string;
  categoryFilter?: string;
  onSearchChange?: (v: string) => void;
  onCategoryChange?: (v: string) => void;
  /** Inline quick-classify: when provided, table shows interactive category selector */
  onClassify?: (txId: string, catId: string | null) => Promise<void>;
  /** Called after a new category is created inline — pass the new category object */
  onCategoryAdded?: (cat: BankCategory) => void;
  /** Whether to show the classify column */
  showClassifyCol?: boolean;
  /** Toggle classify column visibility */
  onToggleClassifyCol?: () => void;
}

function SortIcon({ col, sortBy, sortDir }: { col: SortBy; sortBy?: SortBy; sortDir?: SortDir }) {
  if (sortBy !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 inline ml-1" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-500 inline ml-1" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500 inline ml-1" />;
}

export const BankTransactionsTable = memo(function BankTransactionsTable({
  transactions,
  categories = [],
  isLoading,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
  onEditClick,
  onMergeSelected,
  onUnmergeClick,
  splitCounts,
  searchFilter = "",
  categoryFilter = "",
  onSearchChange,
  onCategoryChange,
  onClassify,
  onCategoryAdded,
  showClassifyCol = true,
  onToggleClassifyCol,
}: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchFilter);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasActiveFilters = searchFilter !== "" || categoryFilter !== "";
  const isFiltersOpen = showFilters || hasActiveFilters;

  useEffect(() => {
    const t = setTimeout(() => { onSearchChange?.(localSearch); }, 400);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    if (searchFilter === "" && localSearch !== "") setLocalSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilter]);

  useEffect(() => {
    if (isFiltersOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [isFiltersOpen]);

  // Clear selection when transaction list changes (new page / filter)
  useEffect(() => { setSelected(new Set()); }, [transactions]);

  const clearAllFilters = () => {
    setLocalSearch("");
    onSearchChange?.("");
    onCategoryChange?.("");
  };

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === transactions.length
        ? new Set()
        : new Set(transactions.map((t) => t.id))
    );
  }, [transactions]);

  const handleMerge = () => {
    const selectedTxs = transactions.filter((t) => selected.has(t.id));
    if (selectedTxs.length >= 2) onMergeSelected?.(selectedTxs);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`flex gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            {[80, 160, 120, 90, 90, 100].map((w, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0 && !hasActiveFilters) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center py-16 text-gray-400">
        <p className="font-medium">אין תנועות להצגה</p>
        <p className="text-sm mt-1">העלה קובץ תנועות בנק כדי להתחיל</p>
      </div>
    );
  }

  const selCount = selected.size;

  return (
    <>
      {/* ── Sticky merge bar — fixed bottom, always visible when items selected ── */}
      {selCount >= 2 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-indigo-700 text-white rounded-2xl shadow-2xl border border-indigo-500 animate-in slide-in-from-bottom-4 duration-200"
          dir="rtl"
        >
          <span className="text-sm font-semibold">{selCount} תנועות נבחרו</span>
          <div className="w-px h-4 bg-indigo-400" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-indigo-200 hover:text-white px-2 py-1 rounded-lg hover:bg-indigo-600 transition-colors"
          >
            בטל בחירה
          </button>
          <button
            onClick={handleMerge}
            className="flex items-center gap-1.5 text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            <MergeIcon className="w-3.5 h-3.5" />
            מזג {selCount} תנועות
          </button>
        </div>
      )}

    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right" dir="rtl">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
              {/* Checkbox column */}
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selCount > 0 && selCount === transactions.length}
                  ref={(el) => { if (el) el.indeterminate = selCount > 0 && selCount < transactions.length; }}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                />
              </th>
              <th
                className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("date")}
              >
                תאריך<SortIcon col="date" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th className="px-4 py-3">תיאור</th>
              <th className="px-4 py-3 hidden md:table-cell">אסמכתא</th>
              <th
                className="px-4 py-3 text-left whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("debit")}
              >
                חובה ₪<SortIcon col="debit" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="px-4 py-3 text-left whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("credit")}
              >
                זכות ₪<SortIcon col="credit" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="px-4 py-3 text-left whitespace-nowrap hidden lg:table-cell cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("balance")}
              >
                יתרה ₪<SortIcon col="balance" sortBy={sortBy} sortDir={sortDir} />
              </th>
              {showClassifyCol && onClassify ? (
                <th className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5">
                    <span>סיווג</span>
                    {onToggleClassifyCol && (
                      <button
                        onClick={onToggleClassifyCol}
                        title="הסתר עמודת סיווג"
                        className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
              ) : !showClassifyCol && onClassify && onToggleClassifyCol ? (
                <th className="px-2 py-3 hidden lg:table-cell w-8">
                  <button
                    onClick={onToggleClassifyCol}
                    title="הצג עמודת סיווג"
                    className="p-0.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </th>
              ) : (
                <th className="px-4 py-3 hidden lg:table-cell">קטגוריה</th>
              )}
              <th className="px-4 py-3 hidden md:table-cell">
                <div className="flex items-center justify-between gap-2">
                  <span>בנק</span>
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    title={isFiltersOpen ? "הסתר סינון" : "סנן"}
                    className={`p-1 rounded transition-colors ${
                      isFiltersOpen
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                </div>
              </th>
            </tr>

            {/* ── Inline filter row ── */}
            {isFiltersOpen && (
              <tr className="bg-blue-50/40 border-b border-blue-100 text-xs">
                <th className="px-3 py-1.5" />
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5">
                  <div className="relative" dir="rtl">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      placeholder="חפש תיאור / אסמכתא..."
                      className="w-full border border-blue-200 rounded-md pr-6 pl-6 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder:text-gray-400"
                    />
                    {localSearch && (
                      <button
                        onClick={() => setLocalSearch("")}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </th>
                <th className="px-2 py-1.5 hidden md:table-cell" />
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5 hidden lg:table-cell" />
                <th className="px-2 py-1.5 hidden lg:table-cell">
                  {showClassifyCol && categories.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={(e) => onCategoryChange?.(e.target.value)}
                      className="w-full border border-blue-200 rounded-md px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">כל הקטגוריות</option>
                      <option value="none">ללא קטגוריה</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </th>
                <th className="px-2 py-1.5 hidden md:table-cell">
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-0.5 text-xs text-red-400 hover:text-red-600 font-normal whitespace-nowrap"
                    >
                      <X className="w-3 h-3" />
                      נקה
                    </button>
                  )}
                </th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  <p className="font-medium">לא נמצאו תנועות לפי הסינון</p>
                  <button onClick={clearAllFilters} className="text-sm text-blue-500 hover:underline mt-1">נקה סינון</button>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isDebit = tx.debit > 0;
                const isCredit = tx.credit > 0;
                const bankInfo = BANK_LABELS[tx.source_bank];
                const cat = tx.category_id ? catMap.get(tx.category_id) : undefined;
                const splitCount = splitCounts?.get(tx.id) ?? 0;
                const isSelected = selected.has(tx.id);
                const isMerged = isMergedMaster(tx);

                return (
                  <tr
                    key={tx.id}
                    onClick={() => onRowClick?.(tx)}
                    className={`group transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                      isSelected ? "bg-indigo-50/60" :
                      isDebit ? "bg-red-50/30 hover:bg-red-50" :
                      isCredit ? "bg-green-50/30 hover:bg-green-50" :
                      "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3" onClick={(e) => toggleSelect(tx.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                      />
                    </td>

                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {formatDate(tx.date)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          {tx.supplier_name ? (
                            <>
                              <p className="font-medium text-gray-800 truncate max-w-[200px]">{tx.supplier_name}</p>
                              <p className="text-xs text-teal-500 truncate max-w-[200px]">{tx.description}</p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-gray-800 truncate max-w-[200px]">{tx.description}</p>
                              {tx.details && (
                                <p className="text-xs text-gray-400 truncate max-w-[200px]">{tx.details}</p>
                              )}
                            </>
                          )}
                          {splitCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                              ⬡ {splitCount} פיצולים
                            </span>
                          )}
                          {isMerged && (
                            <span className="inline-flex items-center gap-0.5 mt-0.5 mr-1 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-1.5 py-0.5">
                              <MergeIcon className="w-2.5 h-2.5" /> ממוזג
                            </span>
                          )}
                        </div>
                        {/* Action buttons — visible on row hover */}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          {onEditClick && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditClick(tx); }}
                              title="ערוך תנועה"
                              className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isMerged && onUnmergeClick && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onUnmergeClick(tx); }}
                              title="בטל מיזוג"
                              className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs font-mono">
                      {tx.reference}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {isDebit && (
                        <span className="text-red-600 font-semibold font-mono">{fmt(tx.debit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {isCredit && (
                        <span className="text-green-600 font-semibold font-mono">{fmt(tx.credit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left hidden lg:table-cell">
                      {tx.balance != null && (
                        <span className={`font-mono text-xs ${tx.balance < 0 ? "text-red-500" : "text-gray-500"}`}>
                          {fmt(tx.balance)}
                        </span>
                      )}
                    </td>
                    {showClassifyCol && (
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {onClassify ? (
                          <InlineCategorySelect
                            tx={tx}
                            categories={categories}
                            catMap={catMap}
                            onClassify={onClassify}
                            onCategoryAdded={onCategoryAdded}
                          />
                        ) : (
                          cat && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_TYPE_COLOR[cat.type] ?? "bg-gray-100 text-gray-500"}`}>
                              {cat.name}
                            </span>
                          )
                        )}
                      </td>
                    )}
                    {!showClassifyCol && onClassify && (
                      <td className="px-2 py-3 hidden lg:table-cell w-8" />
                    )}
                    {!showClassifyCol && !onClassify && (
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {cat && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_TYPE_COLOR[cat.type] ?? "bg-gray-100 text-gray-500"}`}>
                            {cat.name}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {bankInfo && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bankInfo.color}`}>
                          {bankInfo.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
});
