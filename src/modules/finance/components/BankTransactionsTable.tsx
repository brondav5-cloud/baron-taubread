"use client";

import { memo, useState, useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Search, X, Filter, Pencil, Eye, EyeOff, Copy, LayoutList, Lock, Trash2,
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

const VIEWPORT_MARGIN = 8;
const FLOAT_GAP = 4;
/** Above extension bars / table UI */
const FLOAT_Z_INDEX = 100_050;
/** After user pauses typing, apply search; longer delay feels better for Hebrew. */
const SEARCH_FILTER_DEBOUNCE_MS = 550;

/**
 * Fixed panel aligned to trigger (RTL: `right`). Flips above when not enough space below.
 * Sets maxHeight so the panel stays inside the viewport; use flex + min-h-0 inside for scroll.
 */
function calcFloatingPanelStyle(
  btn: HTMLButtonElement,
  panelWidth: number,
  opts?: { estimatedMinHeight?: number; maxHeightCap?: number }
): React.CSSProperties {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const rect = btn.getBoundingClientRect();
  const minH = opts?.estimatedMinHeight ?? 200;
  const cap = opts?.maxHeightCap ?? 460;

  let right = Math.max(VIEWPORT_MARGIN, vw - rect.right);
  if (vw - right - panelWidth < VIEWPORT_MARGIN) {
    right = Math.max(VIEWPORT_MARGIN, vw - panelWidth - VIEWPORT_MARGIN);
  }

  const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN - FLOAT_GAP;
  const spaceAbove = rect.top - VIEWPORT_MARGIN - FLOAT_GAP;

  let placeAbove = spaceBelow < minH && spaceAbove > spaceBelow;
  let maxH = Math.min(cap, Math.max(120, placeAbove ? spaceAbove : spaceBelow));

  if (maxH < minH * 0.55 && spaceAbove !== spaceBelow) {
    placeAbove = spaceAbove >= spaceBelow;
    maxH = Math.min(cap, Math.max(120, placeAbove ? spaceAbove : spaceBelow));
  }

  const base: React.CSSProperties = {
    position: "fixed",
    width: panelWidth,
    right,
    zIndex: FLOAT_Z_INDEX,
    maxHeight: maxH,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  if (placeAbove) {
    return { ...base, bottom: vh - rect.top + FLOAT_GAP, top: "auto" };
  }
  return { ...base, top: rect.bottom + FLOAT_GAP, bottom: "auto" };
}

type SmartFieldKind = "supplier" | "description";

/** Click description or supplier → portal menu: filter, supplier insights panel, copy */
function SmartTxnFieldMenu({
  kind,
  tx,
  pageTransactions,
  onSearchChange,
  onOpenSupplierInsights,
  className,
  children,
}: {
  kind: SmartFieldKind;
  tx: BankTransaction;
  pageTransactions: BankTransaction[];
  onSearchChange?: (v: string) => void;
  onOpenSupplierInsights?: (key: string, displayName: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const primaryText = kind === "supplier" ? (tx.supplier_name ?? "") : (tx.description ?? "");
  const pageMatches =
    kind === "supplier" && tx.supplier_name
      ? pageTransactions.filter((t) => t.supplier_name === tx.supplier_name).length
      : pageTransactions.filter((t) => t.description === tx.description).length;

  const insightsKey =
    kind === "supplier" && tx.supplier_name
      ? tx.supplier_name
      : tx.supplier_name?.trim()
        ? tx.supplier_name
        : tx.description ?? "";
  const insightsDisplay =
    kind === "supplier" && tx.supplier_name
      ? tx.supplier_name
      : tx.supplier_name?.trim()
        ? `${tx.supplier_name} · ${tx.description ?? ""}`.trim()
        : (tx.description ?? "");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      setMenuStyle(calcFloatingPanelStyle(btnRef.current, 240, { estimatedMinHeight: 160, maxHeightCap: 360 }));
    }
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      if (btnRef.current) {
        setMenuStyle(calcFloatingPanelStyle(btnRef.current, 240, { estimatedMinHeight: 160, maxHeightCap: 360 }));
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const close = () => setOpen(false);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    close();
  };

  const hasAnyAction = Boolean(onSearchChange || onOpenSupplierInsights);

  if (!primaryText.trim() || !hasAnyAction) {
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        title="פעולות — סינון, סקירה, העתקה"
        className={className}
      >
        {children}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto min-h-0 flex-1 py-1">
          {pageMatches > 1 && (
            <p className="px-3 pt-2 pb-1 text-[10px] text-gray-400 leading-tight">
              {pageMatches} תנועות זהות בעמוד זה
            </p>
          )}
          {onSearchChange && kind === "supplier" && tx.supplier_name && (
            <button
              type="button"
              onClick={() => { onSearchChange(tx.supplier_name!); close(); }}
              className="w-full text-right px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              סנן בטבלה לפי שם ספק
            </button>
          )}
          {onSearchChange && kind === "description" && tx.description && (
            <button
              type="button"
              onClick={() => { onSearchChange(tx.description); close(); }}
              className="w-full text-right px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              סנן בטבלה לפי תיאור
            </button>
          )}
          {onSearchChange && kind === "description" && tx.details?.trim() && (
            <button
              type="button"
              onClick={() => { onSearchChange(tx.details!); close(); }}
              className="w-full text-right px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              סנן לפי שורת פרטים
            </button>
          )}
          {onSearchChange && kind === "description" && tx.reference?.trim() && (
            <button
              type="button"
              onClick={() => { onSearchChange(tx.reference!); close(); }}
              className="w-full text-right px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              סנן לפי אסמכתא
            </button>
          )}
          {onOpenSupplierInsights && insightsKey.trim() && (
            <button
              type="button"
              onClick={() => {
                onOpenSupplierInsights(insightsKey, insightsDisplay.slice(0, 120));
                close();
              }}
              className="w-full text-right px-3 py-2 text-xs text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 border-t border-gray-50"
            >
              <LayoutList className="w-3.5 h-3.5 shrink-0" />
              סקירה, גרפים ותנועות דומות
            </button>
          )}
          <div className="border-t border-gray-100 mt-0.5 pt-0.5">
            <button
              type="button"
              onClick={() => copyText(primaryText)}
              className="w-full text-right px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              העתק טקסט
            </button>
          </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Inline category selector ──────────────────────────────────────────────────
function InlineCategorySelect({
  tx,
  categories,
  catMap,
  hasSplits,
  onClassify,
  onCategoryAdded,
  onApplySimilarDone,
}: {
  tx: BankTransaction;
  categories: BankCategory[];
  catMap: Map<string, BankCategory>;
  hasSplits: boolean;
  onClassify?: (txId: string, catId: string | null) => Promise<void>;
  onCategoryAdded?: (cat: BankCategory) => void;
  onApplySimilarDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("expense");
  const [saving, setSaving] = useState(false);
  const [localCatId, setLocalCatId] = useState<string | undefined>(tx.category_id);
  const [manualLock, setManualLock] = useState(() => tx.category_override === "manual");

  const [showRulePrompt, setShowRulePrompt] = useState(false);
  const [ruleField, setRuleField] = useState<RuleField>(tx.supplier_name ? "supplier_name" : "description");
  const [ruleMatchValue, setRuleMatchValue] = useState("");
  const [applyOnClassified, setApplyOnClassified] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const isSplitLine = Boolean(tx.is_split_line);
  const isParentWithSplits = hasSplits && !isSplitLine;

  // Generic descriptions that should warn the user to pick a more specific field
  const GENERIC_DESCS = ["העברה דיגיטל", "העברה בנקאית", "העברה", "תשלום", "פקודת זיכוי", "פקודת חיוב", "זיכוי", "חיוב", "הוראת קבע"];
  const isGenericDesc = GENERIC_DESCS.some((g) => tx.description?.trim() === g);

  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});
  const [ruleStyle, setRuleStyle] = useState<React.CSSProperties>({});

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocalCatId(tx.category_id); }, [tx.category_id]);
  useEffect(() => {
    setManualLock(tx.category_override === "manual");
  }, [tx.id, tx.category_override]);

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

  const repositionFloating = useCallback(() => {
    if (!buttonRef.current) return;
    if (open) {
      setDropStyle(calcFloatingPanelStyle(buttonRef.current, 256, { estimatedMinHeight: 280, maxHeightCap: 480 }));
    }
    if (showRulePrompt) {
      setRuleStyle(calcFloatingPanelStyle(buttonRef.current, 292, { estimatedMinHeight: 260, maxHeightCap: 420 }));
    }
  }, [open, showRulePrompt]);

  useLayoutEffect(() => {
    if (!open && !showRulePrompt) return;
    repositionFloating();
    window.addEventListener("scroll", repositionFloating, true);
    window.addEventListener("resize", repositionFloating);
    return () => {
      window.removeEventListener("scroll", repositionFloating, true);
      window.removeEventListener("resize", repositionFloating);
    };
  }, [open, showRulePrompt, repositionFloating]);

  const cat = localCatId ? catMap.get(localCatId) : undefined;

  const ruleValueForField = (field: RuleField): string => {
    if (field === "supplier_name") return tx.supplier_name ?? "";
    if (field === "details") return tx.details ?? "";
    if (field === "operation_code") return tx.operation_code ?? "";
    return tx.description ?? "";
  };

  const handleOpen = () => {
    if (isParentWithSplits) return;
    if (saving) return;
    if (open) { setOpen(false); return; }
    if (buttonRef.current) {
      setDropStyle(calcFloatingPanelStyle(buttonRef.current, 256, { estimatedMinHeight: 280, maxHeightCap: 480 }));
    }
    setSearch("");
    setShowRulePrompt(false);
    setOpen(true);
  };

  const openRulePrompt = () => {
    // Smart default field: if description is generic, prefer details or supplier_name
    let defaultField: RuleField = tx.supplier_name ? "supplier_name" : "description";
    if (isSplitLine) defaultField = "description";
    if (isGenericDesc) {
      if (tx.supplier_name) defaultField = "supplier_name";
      else if (tx.details) defaultField = "details";
    }
    setRuleField(defaultField);
    setRuleMatchValue(ruleValueForField(defaultField));
    setApplyOnClassified(false);
    if (buttonRef.current) {
      setRuleStyle(calcFloatingPanelStyle(buttonRef.current, 292, { estimatedMinHeight: 260, maxHeightCap: 420 }));
    }
    setShowRulePrompt(true);
  };

  const handleSelect = async (catId: string | null) => {
    if (isParentWithSplits) return;
    setOpen(false);
    setSearch("");
    setAddMode(false);
    const prevId = localCatId;
    setLocalCatId(catId ?? undefined);
    setSaving(true);
    try {
      await onClassify?.(tx.id, catId);
      if (!catId) setManualLock(false);
      if (catId) openRulePrompt();
    } catch {
      setLocalCatId(prevId);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async (applyNow = false) => {
    if (!localCatId || !ruleMatchValue.trim()) return;
    setSavingRule(true);
    try {
      const ruleRes = isSplitLine
        ? await fetch("/api/finance/splits/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rules: [{ match_value: ruleMatchValue.trim(), category_id: localCatId }],
            }),
          })
        : await fetch("/api/finance/categories/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category_id: localCatId,
              match_field: ruleField,
              match_type: "contains",
              match_value: ruleMatchValue.trim(),
            }),
          });
      if (!ruleRes.ok) return;
      if (applyNow) {
        if (isSplitLine) {
          await fetch("/api/finance/splits/bulk-classify", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              include_classified: applyOnClassified,
              rules: [{ description: ruleMatchValue.trim(), category_id: localCatId }],
            }),
          });
        } else {
          await fetch("/api/finance/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "apply_single_rule",
              include_classified: applyOnClassified,
              rule: {
                category_id: localCatId,
                match_field: ruleField,
                match_type: "contains",
                match_value: ruleMatchValue.trim(),
              },
            }),
          });
        }
        onApplySimilarDone?.();
      }
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
        openRulePrompt();
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

  const handleLockPersist = async () => {
    if (isParentWithSplits) return;
    if (!localCatId || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "lock", tx_id: tx.id }),
      });
      if (res.ok) setManualLock(true);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockManual = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "unlock_manual", tx_id: tx.id }),
      });
      if (res.ok) setManualLock(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {/* ── Trigger badge ── */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title={
          isParentWithSplits
            ? "לתנועה זו יש פיצול פעיל — הסיווג הראשי נעול כדי למנוע התנגשות"
            : cat
            ? manualLock
              ? "נעול — לחץ לבטל נעילה או לשנות קטגוריה"
              : "בחר קטגוריה; נעילה אופציונלית בתפריט"
            : "הוסף סיווג"
        }
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
          cat
            ? `${CAT_TYPE_COLOR[cat.type] ?? "bg-gray-100 text-gray-500"} border-transparent hover:opacity-80`
            : "text-gray-400 border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-600 bg-transparent"
        } ${saving ? "opacity-50 cursor-wait" : isParentWithSplits ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {saving ? (
          <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
        ) : cat ? (
          <>
            {manualLock && <Lock className="w-3 h-3 shrink-0 opacity-80" aria-hidden />}
            <span>{cat.name}</span>
          </>
        ) : (
          <span className="text-[10px] font-medium">+ סיווג</span>
        )}
      </button>

      {/* ── Category picker — rendered via portal so it escapes table overflow ── */}
      {open && !isParentWithSplits && typeof document !== "undefined" && createPortal(
        <div
          ref={dropRef}
          style={dropStyle}
          className="bg-white rounded-xl shadow-2xl border border-gray-100"
          dir="rtl"
        >
          {/* Search input */}
          <div className="shrink-0 px-2 pt-2 pb-1 border-b border-gray-50">
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

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
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

          {/* Manual lock — persists category against auto-classify */}
          {cat && !isSplitLine && (
            <div className="shrink-0 border-t border-amber-100 bg-amber-50/50 px-2 py-2 space-y-1">
              {manualLock ? (
                <>
                  <p className="text-[10px] text-amber-900/80 px-1 leading-snug">
                    תנועה זו מסומנת כנעולה (לחצת &quot;נעל&quot;). אפשר לבטל למטה.
                  </p>
                  <button
                    type="button"
                    onClick={() => { void handleUnlockManual(); }}
                    disabled={saving}
                    className="w-full text-right px-3 py-1.5 text-xs text-gray-600 hover:bg-white/70 rounded-lg"
                  >
                    בטל נעילה בלבד
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-amber-900/80 px-1 leading-snug">
                    בחירת קטגוריה לא מפעילה מנעול. לחץ רק אם תרצה לסמן תנועה זו במנעול.
                  </p>
                  <button
                    type="button"
                    onClick={() => { void handleLockPersist(); }}
                    disabled={saving}
                    className="w-full text-right px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/80 rounded-lg flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    נעל סיווג ידני
                  </button>
                </>
              )}
            </div>
          )}

          {/* Add new category */}
          <div className="shrink-0 border-t border-gray-100">
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
      {showRulePrompt && localCatId && !isParentWithSplits && typeof document !== "undefined" && createPortal(
        <div
          ref={ruleRef}
          style={ruleStyle}
          className="bg-purple-50 border border-purple-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          dir="rtl"
        >
          <div className="overflow-y-auto overscroll-contain min-h-0 flex-1 p-3 space-y-2">
          <p className="text-xs font-semibold text-purple-800">צור כלל אוטומטי לתנועות דומות?</p>

          {/* Warning for generic descriptions */}
          {isGenericDesc && ruleField === "description" && (
            <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              <span className="text-amber-500 text-[11px] leading-none mt-0.5">⚠</span>
              <p className="text-[10px] text-amber-700 leading-snug">
                &quot;{tx.description}&quot; הוא תיאור גנרי — כלל כזה יסווג את כל ההעברות הדיגיטליות.<br />
                מומלץ לבחור <strong>פרטים</strong> או <strong>שם ספק</strong> לסיווג ספציפי.
              </p>
            </div>
          )}

          {/* Field selector */}
          {!isSplitLine ? (
            <select
              value={ruleField}
              onChange={(e) => {
                const f = e.target.value as RuleField;
                setRuleField(f);
                setRuleMatchValue(ruleValueForField(f));
              }}
              className="w-full border border-purple-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              {tx.supplier_name && <option value="supplier_name">שם ספק</option>}
              <option value="description">תיאור</option>
              {tx.details && <option value="details">פרטים</option>}
              {tx.operation_code && <option value="operation_code">קוד פעולה</option>}
            </select>
          ) : (
            <p className="text-[10px] text-purple-700 bg-purple-100/60 border border-purple-200 rounded-md px-2 py-1">
              שורת פיצול: הכלל נשמר לפי תיאור השורה.
            </p>
          )}

          {/* Editable match value */}
          <input
            type="text"
            value={ruleMatchValue}
            onChange={(e) => setRuleMatchValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { void handleCreateRule(false); } if (e.key === "Escape") setShowRulePrompt(false); }}
            placeholder="ערך לחיפוש..."
            className="w-full border border-purple-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
          />
          <p className="text-[9px] text-purple-400">ניתן לקצר את הערך — החיפוש הוא &quot;מכיל&quot;</p>
          <label className="flex items-center gap-2 text-[11px] text-purple-700">
            <input
              type="checkbox"
              checked={applyOnClassified}
              onChange={(e) => setApplyOnClassified(e.target.checked)}
              className="rounded border-purple-300"
            />
            לכלול גם תנועות שכבר מסווגות (רק לפי כלל זה)
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { void handleCreateRule(false); }}
              disabled={savingRule || !ruleMatchValue.trim()}
              className="flex items-center gap-1.5 text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
            >
              {savingRule && <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
              צור כלל
            </button>
            <button
              onClick={() => { void handleCreateRule(true); }}
              disabled={savingRule || !ruleMatchValue.trim()}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
            >
              צור כלל + החל עכשיו
            </button>
            <button
              onClick={() => setShowRulePrompt(false)}
              className="text-xs text-purple-400 hover:text-purple-600 transition-colors"
            >
              דלג
            </button>
          </div>
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
  bankFilter?: SourceBank | "";
  onSearchChange?: (v: string) => void;
  onCategoryChange?: (v: string) => void;
  onBankChange?: (v: SourceBank | "") => void;
  /** Inline quick-classify: when provided, table shows interactive category selector */
  onClassify?: (txId: string, catId: string | null) => Promise<void>;
  /** Called after a new category is created inline — pass the new category object */
  onCategoryAdded?: (cat: BankCategory) => void;
  /** Whether to show the classify column */
  showClassifyCol?: boolean;
  /** Toggle classify column visibility */
  onToggleClassifyCol?: () => void;
  /** Open supplier insights side panel (same as from transaction detail) */
  onOpenSupplierInsights?: (key: string, displayName: string) => void;
  /** Called after inline rule is created and auto-applied */
  onApplySimilarDone?: () => void;
  /** Optional set of transaction IDs identified as duplicates */
  duplicateTxIds?: Set<string>;
  /** Delete a transaction row */
  onDeleteClick?: (tx: BankTransaction) => void;
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
  bankFilter = "",
  onSearchChange,
  onCategoryChange,
  onBankChange,
  onClassify,
  onCategoryAdded,
  showClassifyCol = true,
  onToggleClassifyCol,
  onOpenSupplierInsights,
  onApplySimilarDone,
  duplicateTxIds,
  onDeleteClick,
}: Props) {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchFilter);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsedSplitGroups, setCollapsedSplitGroups] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  const clearSearchDebounce = useCallback(() => {
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
      searchDebounceTimerRef.current = null;
    }
  }, []);

  const hasActiveFilters = searchFilter !== "" || categoryFilter !== "" || bankFilter !== "";
  const isFiltersOpen = showFilters || hasActiveFilters;

  const flushSearchToParent = useCallback(() => {
    clearSearchDebounce();
    if (localSearch !== searchFilter) {
      onSearchChangeRef.current?.(localSearch);
    }
  }, [clearSearchDebounce, localSearch, searchFilter]);

  useEffect(() => {
    clearSearchDebounce();
    searchDebounceTimerRef.current = setTimeout(() => {
      searchDebounceTimerRef.current = null;
      onSearchChangeRef.current?.(localSearch);
    }, SEARCH_FILTER_DEBOUNCE_MS);
    return () => {
      clearSearchDebounce();
    };
  }, [localSearch, clearSearchDebounce]);

  useEffect(() => {
    if (searchFilter === "" && localSearch !== "") setLocalSearch("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilter]);

  useEffect(() => {
    if (isFiltersOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [isFiltersOpen]);

  // Clear selection when transaction list changes (new page / filter)
  useEffect(() => { setSelected(new Set()); }, [transactions]);

  // Default: keep split groups collapsed for cleaner table.
  useEffect(() => {
    const groups = new Set(
      transactions
        .filter((t) => t.is_split_line && t.split_parent_id)
        .map((t) => t.split_parent_id!)
    );
    setCollapsedSplitGroups(groups);
  }, [transactions]);

  const clearAllFilters = () => {
    clearSearchDebounce();
    setLocalSearch("");
    onSearchChangeRef.current?.("");
    onCategoryChange?.("");
    onBankChange?.("");
  };

  /** Immediate filter from smart menu + show filter row */
  const applySearchFilter = useCallback(
    (v: string) => {
      clearSearchDebounce();
      setLocalSearch(v);
      onSearchChangeRef.current?.(v);
      setShowFilters(true);
    },
    [clearSearchDebounce]
  );

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectableTransactions = transactions.filter((t) => !t.is_split_line);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === selectableTransactions.length
        ? new Set()
        : new Set(selectableTransactions.map((t) => t.id))
    );
  }, [selectableTransactions]);

  const handleMerge = () => {
    const selectedTxs = transactions.filter((t) => selected.has(t.id) && !t.is_split_line);
    if (selectedTxs.length >= 2) onMergeSelected?.(selectedTxs);
  };

  type DisplayRow =
    | {
      kind: "split_header";
      key: string;
      groupId: string;
      label: string;
      date: string;
      rows: number;
      amount: number;
    }
    | {
      kind: "tx";
      key: string;
      tx: BankTransaction;
    };

  const displayRows: DisplayRow[] = [];
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i]!;
    const groupId = tx.split_parent_id;
    if (!tx.is_split_line || !groupId) {
      displayRows.push({ kind: "tx", key: tx.id, tx });
      continue;
    }

    const firstInGroup = i === 0 || transactions[i - 1]?.split_parent_id !== groupId;
    if (!firstInGroup) continue;

    const groupRows: BankTransaction[] = [];
    let j = i;
    while (j < transactions.length && transactions[j]?.split_parent_id === groupId) {
      groupRows.push(transactions[j]!);
      j++;
    }
    const amount = groupRows.reduce((sum, r) => sum + Math.abs((r.debit > 0 ? r.debit : r.credit) || 0), 0);
    const label = groupRows[0]?.split_source_label ?? "כרטיס";
    const date = groupRows[0]?.date ?? "";
    displayRows.push({
      kind: "split_header",
      key: `split-header-${groupId}`,
      groupId,
      label,
      date,
      rows: groupRows.length,
      amount,
    });
    if (!collapsedSplitGroups.has(groupId)) {
      for (const row of groupRows) {
        displayRows.push({ kind: "tx", key: row.id, tx: row });
      }
    }
  }

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
  const selectedRows = selectableTransactions.filter((tx) => selected.has(tx.id));
  const selectedDebitTotal = selectedRows.reduce((sum, tx) => sum + (tx.debit || 0), 0);
  const selectedCreditTotal = selectedRows.reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const selectedPrimaryTotal = selectedDebitTotal > 0 ? selectedDebitTotal : selectedCreditTotal;

  return (
    <>
      {/* ── Sticky merge bar — fixed bottom, always visible when items selected ── */}
      {selCount >= 2 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-indigo-700 text-white rounded-2xl shadow-2xl border border-indigo-500 animate-in slide-in-from-bottom-4 duration-200"
          dir="rtl"
        >
          <span className="text-sm font-semibold">{selCount} תנועות נבחרו</span>
          <div className="text-sm font-bold bg-indigo-800/60 px-3 py-1 rounded-xl">
            סה&quot;כ: ₪{selectedPrimaryTotal.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
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
                  checked={selCount > 0 && selCount === selectableTransactions.length}
                  ref={(el) => { if (el) el.indeterminate = selCount > 0 && selCount < selectableTransactions.length; }}
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
              <th
                className="px-4 py-3 hidden lg:table-cell whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("supplier_name")}
              >
                שם ספק<SortIcon col="supplier_name" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("description")}
              >
                תיאור<SortIcon col="description" sortBy={sortBy} sortDir={sortDir} />
              </th>
              <th
                className="px-4 py-3 hidden md:table-cell whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                onClick={() => onSort?.("reference")}
              >
                אסמכתא<SortIcon col="reference" sortBy={sortBy} sortDir={sortDir} />
              </th>
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
                    <button
                      onClick={() => onSort?.("category_id")}
                      className="inline-flex items-center whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                      title="מיון לפי סיווג"
                    >
                      <span>סיווג</span>
                      <SortIcon col="category_id" sortBy={sortBy} sortDir={sortDir} />
                    </button>
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
                  <button
                    onClick={() => onSort?.("source_bank")}
                    className="inline-flex items-center whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                    title="מיון לפי בנק"
                  >
                    <span>בנק</span>
                    <SortIcon col="source_bank" sortBy={sortBy} sortDir={sortDir} />
                  </button>
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
                <th className="px-2 py-1.5 hidden lg:table-cell" />
                <th className="px-2 py-1.5">
                  <div className="relative" dir="rtl">
                    <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      onBlur={flushSearchToParent}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          flushSearchToParent();
                        }
                      }}
                      placeholder="חפש ספק / תיאור / אסמכתא / בנק / קוד..."
                      className="w-full border border-blue-200 rounded-md pr-6 pl-6 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder:text-gray-400"
                    />
                    {localSearch && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          clearSearchDebounce();
                          setLocalSearch("");
                          onSearchChangeRef.current?.("");
                        }}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="נקה חיפוש"
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
                  <div className="flex items-center gap-2">
                    <select
                      value={bankFilter}
                      onChange={(e) => onBankChange?.(e.target.value as SourceBank | "")}
                      className="w-full border border-blue-200 rounded-md px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      <option value="">כל הבנקים</option>
                      {Object.entries(BANK_LABELS).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-0.5 text-xs text-red-400 hover:text-red-600 font-normal whitespace-nowrap"
                      >
                        <X className="w-3 h-3" />
                        נקה
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  <p className="font-medium">לא נמצאו תנועות לפי הסינון</p>
                  <button onClick={clearAllFilters} className="text-sm text-blue-500 hover:underline mt-1">נקה סינון</button>
                </td>
              </tr>
            ) : (
              displayRows.map((row) => {
                if (row.kind === "split_header") {
                  const isCollapsed = collapsedSplitGroups.has(row.groupId);
                  return (
                    <tr key={row.key} className="bg-purple-50/70 border-y border-purple-100">
                      <td colSpan={10} className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollapsedSplitGroups((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.groupId)) next.delete(row.groupId);
                              else next.add(row.groupId);
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between text-right"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-purple-700 font-semibold">💳 {row.label}</span>
                            <span className="text-purple-400">•</span>
                            <span className="text-purple-600">{row.rows} שורות</span>
                            <span className="text-purple-400">•</span>
                            <span className="text-purple-600 font-mono">{formatDate(row.date)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-purple-700 font-semibold font-mono text-xs">{fmt(row.amount)}</span>
                            {isCollapsed ? (
                              <ChevronDown className="w-3.5 h-3.5 text-purple-500" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5 text-purple-500" />
                            )}
                          </div>
                        </button>
                      </td>
                    </tr>
                  );
                }
                const tx = row.tx;
                const isDebit = tx.debit > 0;
                const isCredit = tx.credit > 0;
                const bankInfo = BANK_LABELS[tx.source_bank];
                const cat = tx.category_id ? catMap.get(tx.category_id) : undefined;
                const splitCount = splitCounts?.get(tx.id) ?? 0;
                const isSelected = selected.has(tx.id);
                const isMerged = isMergedMaster(tx);
                const isSplitLine = Boolean(tx.is_split_line);
                const isDuplicate = Boolean(duplicateTxIds?.has(tx.id));

                return (
                  <tr
                    key={tx.id}
                    onClick={() => onRowClick?.(tx)}
                    className={`group transition-colors ${onRowClick ? "cursor-pointer" : ""} ${
                      isSelected ? "bg-indigo-50/60" :
                      isDuplicate ? "bg-amber-50/70 hover:bg-amber-50" :
                      isDebit ? "bg-red-50/30 hover:bg-red-50" :
                      isCredit ? "bg-green-50/30 hover:bg-green-50" :
                      "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="px-3 py-3"
                      onClick={(e) => {
                        if (isSplitLine) return;
                        toggleSelect(tx.id, e);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        disabled={isSplitLine}
                        className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                      />
                    </td>

                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {formatDate(tx.date)}
                    </td>

                    {/* ── שם ספק column ── */}
                    <td className="px-4 py-3 hidden lg:table-cell max-w-[160px]">
                      {tx.supplier_name && (
                        <SmartTxnFieldMenu
                          kind="supplier"
                          tx={tx}
                          pageTransactions={transactions}
                          onSearchChange={applySearchFilter}
                          onOpenSupplierInsights={onOpenSupplierInsights}
                          className="text-sm font-medium text-gray-800 truncate block max-w-[150px] text-right hover:text-blue-600 hover:underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          {tx.supplier_name}
                        </SmartTxnFieldMenu>
                      )}
                    </td>

                    {/* ── תיאור column ── */}
                    <td className="px-4 py-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <SmartTxnFieldMenu
                            kind="description"
                            tx={tx}
                            pageTransactions={transactions}
                            onSearchChange={applySearchFilter}
                            onOpenSupplierInsights={onOpenSupplierInsights}
                            className="font-medium text-gray-800 truncate max-w-[200px] block text-right hover:text-blue-600 hover:underline underline-offset-2 transition-colors cursor-pointer"
                          >
                            {tx.description}
                          </SmartTxnFieldMenu>
                          {tx.details && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]" title={tx.details}>
                              {tx.details}
                            </p>
                          )}
                          {splitCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                              ⬡ {splitCount} פיצולים
                            </span>
                          )}
                          {isSplitLine && (
                            <span className="inline-flex items-center gap-1 mt-0.5 mr-1 text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-1.5 py-0.5">
                              💳 {tx.split_source_label ?? "כרטיס"}
                            </span>
                          )}
                          {isMerged && (
                            <span className="inline-flex items-center gap-0.5 mt-0.5 mr-1 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-1.5 py-0.5">
                              <MergeIcon className="w-2.5 h-2.5" /> ממוזג
                            </span>
                          )}
                          {isDuplicate && (
                            <span className="inline-flex items-center gap-1 mt-0.5 mr-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                              כפילות
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
                          {!isSplitLine && onDeleteClick && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteClick(tx); }}
                              title="מחק תנועה"
                              className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                            hasSplits={isSplitLine ? false : splitCount > 0}
                            onClassify={onClassify}
                            onCategoryAdded={onCategoryAdded}
                            onApplySimilarDone={onApplySimilarDone}
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
