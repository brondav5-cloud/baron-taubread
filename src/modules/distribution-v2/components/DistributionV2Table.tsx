"use client";

import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, ChevronsUpDown, Filter, GripVertical, Table2, X } from "lucide-react";
import type {
  DistributionV2Row,
  DistributionV2ColumnKey,
  ColumnFiltersState,
  ColumnPicklistsState,
  DistributionV2GroupBlock,
  DistributionV2SummaryStats,
  GroupByMode,
  DistributionViewMode,
} from "../types";
import { DISTRIBUTION_V2_COLUMNS } from "../types";

const COLUMN_ORDER_STORAGE_KEY = "distribution-v2-column-order";

function loadColumnOrder(): DistributionV2ColumnKey[] {
  if (typeof window === "undefined") return [...DISTRIBUTION_V2_COLUMNS];
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!raw) return [...DISTRIBUTION_V2_COLUMNS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DISTRIBUTION_V2_COLUMNS];
    const set = new Set(DISTRIBUTION_V2_COLUMNS);
    const ordered = parsed.filter((c: unknown) => typeof c === "string" && set.has(c as DistributionV2ColumnKey));
    if (ordered.length !== set.size) return [...DISTRIBUTION_V2_COLUMNS];
    return ordered as DistributionV2ColumnKey[];
  } catch {
    return [...DISTRIBUTION_V2_COLUMNS];
  }
}

const COLUMN_HIDDEN_STORAGE_KEY = "distribution-v2-column-hidden";

function loadHiddenColumns(): DistributionV2ColumnKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COLUMN_HIDDEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(DISTRIBUTION_V2_COLUMNS);
    const out: DistributionV2ColumnKey[] = [];
    const seen = new Set<string>();
    for (const c of parsed) {
      if (typeof c === "string" && valid.has(c as DistributionV2ColumnKey) && !seen.has(c)) {
        seen.add(c);
        out.push(c as DistributionV2ColumnKey);
      }
    }
    if (out.length >= DISTRIBUTION_V2_COLUMNS.length) return [];
    return out;
  } catch {
    return [];
  }
}

const COLUMN_LABELS: Record<DistributionV2ColumnKey, string> = {
  month: "חודש",
  periodDate: "תאריך",
  customerId: "מזהה לקוח",
  customer: "לקוח",
  network: "רשת",
  city: "עיר",
  productId: "מזהה מוצר",
  product: "מוצר",
  productCategory: "קטגוריה",
  quantity: "כמות",
  returns: "חזרות",
  returnsPct: "% חזרות",
  sales: "מכירות",
  driver: "נהג",
  agent: "סוכן",
};

const MAX_UNIQUE_IN_LIST = 450;

function getCellValue(row: DistributionV2Row, column: DistributionV2ColumnKey): string {
  const v = row[column];
  if (v === undefined || v === null) return "";
  return String(v);
}

/** Text columns: single line + ellipsis; wider on large screens (professional table UX). */
const TRUNCATE_TEXT_COLS: DistributionV2ColumnKey[] = [
  "customer",
  "product",
  "network",
  "city",
  "driver",
  "agent",
  "productCategory",
];

function getTdClassForColumn(col: DistributionV2ColumnKey, noAccent?: boolean): string {
  const base =
    "px-2.5 py-1.5 text-slate-700 align-middle border-s border-slate-100 first:border-s-0 text-[12px] leading-tight max-h-[2.25rem]";
  const accent = noAccent ? "font-medium text-slate-800" : "border-s-[3px] border-s-primary-400/25 font-medium text-slate-800";
  const truncateWide =
    "min-w-0 max-w-[9rem] sm:max-w-[12rem] md:max-w-[15rem] lg:max-w-[18rem] xl:max-w-[22rem] 2xl:max-w-[26rem]";
  if (col === "month") return `${base} ${accent}`;
  if (col === "periodDate" || col === "customerId" || col === "productId") return `${base} tabular-nums whitespace-nowrap`;
  if (TRUNCATE_TEXT_COLS.includes(col)) return `${base} ${truncateWide}`;
  if (col === "quantity") return `${base} font-medium tabular-nums whitespace-nowrap`;
  if (col === "returns") return `${base} tabular-nums whitespace-nowrap`;
  if (col === "returnsPct") return `${base} tabular-nums whitespace-nowrap text-slate-500`;
  if (col === "sales") return `${base} tabular-nums font-semibold text-slate-900 whitespace-nowrap`;
  return base;
}

const GROUP_BY_HINT: Record<GroupByMode, string> = {
  products: "מוצר",
  customers: "חנות / לקוח",
  drivers: "נהג",
};

const ColumnsVisibilityPanel = forwardRef<
  HTMLDivElement,
  {
    columnOrder: DistributionV2ColumnKey[];
    hiddenSet: Set<DistributionV2ColumnKey>;
    visibleColumnOrder: DistributionV2ColumnKey[];
    onToggle: (key: DistributionV2ColumnKey) => void;
    onShowAll: () => void;
  }
>(function ColumnsVisibilityPanel(
  { columnOrder, hiddenSet, visibleColumnOrder, onToggle, onShowAll },
  ref,
) {
  return (
    <div
      ref={ref}
      className="absolute end-0 top-full mt-2 z-[60] w-[min(100vw-2rem,18rem)] rounded-2xl border border-slate-200 bg-white shadow-elevated p-3 max-h-[min(60vh,380px)] overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-label="בחירת עמודות להצגה"
    >
      <p className="text-xs font-bold text-slate-700 mb-2">הצג עמודות</p>
      <ul className="space-y-0.5 mb-3">
        {columnOrder.map((col) => {
          const visible = !hiddenSet.has(col);
          const onlyOne = visibleColumnOrder.length === 1 && visible;
          return (
            <li key={col}>
              <label
                className={[
                  "flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 rounded-lg px-2 py-1.5",
                  onlyOne ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={onlyOne}
                  onChange={() => onToggle(col)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500/30 shrink-0"
                />
                <span>{COLUMN_LABELS[col]}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onShowAll}
        className="text-xs font-semibold text-primary-600 hover:text-primary-700"
      >
        הצג את כל העמודות
      </button>
    </div>
  );
});

function SortableTh({
  col,
  label,
  isSorted,
  sortDir,
  onSort,
  children,
}: {
  col: DistributionV2ColumnKey;
  label: string;
  isSorted?: boolean;
  sortDir?: "asc" | "desc";
  onSort?: () => void;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className={[
        "sticky top-0 z-[15] box-border min-h-[2.75rem] bg-[#f4f6f9] px-2.5 py-2 text-xs font-bold text-slate-600 tracking-wide whitespace-nowrap border-s border-slate-200/80 first:border-s-0 shadow-[0_1px_0_0_rgb(226,232,240)]",
        isDragging && "z-[60] opacity-95 bg-slate-100 ring-2 ring-primary-400/40",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-end gap-1.5">
        {children}
        <button
          type="button"
          onClick={onSort}
          className={[
            "flex-1 min-w-0 flex items-center justify-end gap-1 rounded focus:outline-none focus:ring-1 focus:ring-primary-400/40",
            isSorted ? "text-primary-700" : "hover:text-slate-900",
          ].join(" ")}
          title={`מיין לפי ${label}`}
        >
          <span className="truncate">{label}</span>
          {isSorted ? (
            sortDir === "asc" ? (
              <ChevronUp className="w-3 h-3 shrink-0 text-primary-600" />
            ) : (
              <ChevronDown className="w-3 h-3 shrink-0 text-primary-600" />
            )
          ) : (
            <ChevronsUpDown className="w-3 h-3 shrink-0 text-slate-300 group-hover:text-slate-400" />
          )}
        </button>
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          aria-label="גרור לשינוי סדר עמודה"
        >
          <GripVertical className="w-4 h-4 shrink-0" />
        </span>
      </div>
    </th>
  );
}

/** Max detail rows to show when expanding all — beyond this we batch or cap */
const MAX_EXPANDED_ROWS = 500;
/** Groups to add per frame when expanding progressively */
const EXPAND_BATCH_GROUPS = 4;

interface DistributionV2TableProps {
  viewMode: DistributionViewMode;
  displayRows: DistributionV2Row[];
  groupBlocks: DistributionV2GroupBlock[];
  groupBy: GroupByMode;
  filteredRowCount: number;
  summaryStats: DistributionV2SummaryStats | null;
  rowsBeforeColumnFilter: DistributionV2Row[];
  columnFilters: ColumnFiltersState;
  columnPicklists: ColumnPicklistsState;
  onColumnFilter: (column: DistributionV2ColumnKey, value: string) => void;
  onColumnPicklist: (column: DistributionV2ColumnKey, values: string[]) => void;
  onClearColumnFilters: () => void;
  hasActiveColumnFilters: boolean;
  sortColumn: DistributionV2ColumnKey | null;
  sortDirection: "asc" | "desc";
  onSort: (column: DistributionV2ColumnKey) => void;
}

export function DistributionV2Table({
  viewMode,
  displayRows,
  groupBlocks,
  groupBy,
  filteredRowCount,
  summaryStats,
  rowsBeforeColumnFilter,
  columnFilters,
  columnPicklists,
  onColumnFilter,
  onColumnPicklist,
  onClearColumnFilters,
  hasActiveColumnFilters,
  sortColumn,
  sortDirection,
  onSort,
}: DistributionV2TableProps) {
  const [columnOrder, setColumnOrder] = useState<DistributionV2ColumnKey[]>(loadColumnOrder);
  const [hiddenColumns, setHiddenColumns] = useState<DistributionV2ColumnKey[]>(loadHiddenColumns);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [openColumn, setOpenColumn] = useState<DistributionV2ColumnKey | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [expandAllBlocked, setExpandAllBlocked] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null!);
  const expandingRef = useRef(false);
  const columnsMenuBtnRef = useRef<HTMLButtonElement>(null);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const hiddenSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);

  const visibleColumnOrder = useMemo(() => {
    const v = columnOrder.filter((c) => !hiddenSet.has(c));
    return v.length > 0 ? v : [...columnOrder];
  }, [columnOrder, hiddenSet]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder));
    } catch {
      /* ignore */
    }
  }, [columnOrder]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_HIDDEN_STORAGE_KEY, JSON.stringify(hiddenColumns));
    } catch {
      /* ignore */
    }
  }, [hiddenColumns]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setColumnOrder((prev) => {
        const h = new Set(hiddenColumns);
        const visible = prev.filter((c) => !h.has(c));
        const a = visible.indexOf(active.id as DistributionV2ColumnKey);
        const b = visible.indexOf(over.id as DistributionV2ColumnKey);
        if (a === -1 || b === -1) return prev;
        const newVisible = arrayMove(visible, a, b);
        const tail = prev.filter((c) => h.has(c));
        return [...newVisible, ...tail];
      });
    },
    [hiddenColumns],
  );

  const toggleColumnVisible = useCallback((key: DistributionV2ColumnKey) => {
    setHiddenColumns((prev) => {
      const s = new Set(prev);
      if (s.has(key)) {
        s.delete(key);
        return Array.from(s);
      }
      const vis = columnOrder.filter((c) => !s.has(c));
      if (vis.length <= 1) return prev;
      s.add(key);
      return Array.from(s);
    });
  }, [columnOrder]);

  const showAllColumns = useCallback(() => setHiddenColumns([]), []);

  useEffect(() => {
    if (!columnsMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (columnsMenuRef.current?.contains(t) || columnsMenuBtnRef.current?.contains(t)) return;
      setColumnsMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setColumnsMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [columnsMenuOpen]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    setExpandedIds(new Set());
    setExpandAllBlocked(false);
  }, [groupBy]);

  /** Lock body scroll when any column filter popover is open (modal behavior) */
  useEffect(() => {
    if (!openColumn) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [openColumn]);

  const totalRowsOnPage = useMemo(
    () => groupBlocks.reduce((s, g) => s + g.rowCount, 0),
    [groupBlocks],
  );

  const toggleGroup = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllOnPage = useCallback(() => {
    if (expandingRef.current) return;
    const ids = groupBlocks.map((g) => g.id);
    if (ids.length === 0) return;

    if (totalRowsOnPage > MAX_EXPANDED_ROWS) {
      setExpandAllBlocked(true);
      return;
    }

    expandingRef.current = true;
    setIsExpanding(true);
    let index = 0;

    const runBatch = () => {
      const batch = ids.slice(index, index + EXPAND_BATCH_GROUPS);
      index += EXPAND_BATCH_GROUPS;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        batch.forEach((id) => next.add(id));
        return next;
      });
      if (index < ids.length) {
        requestAnimationFrame(runBatch);
      } else {
        expandingRef.current = false;
        setIsExpanding(false);
      }
    };
    requestAnimationFrame(runBatch);
  }, [groupBlocks, totalRowsOnPage]);

  const collapseAllOnPage = useCallback(() => {
    if (expandedIds.size === 0) return;
    setExpandAllBlocked(false);
    startTransition(() => {
      setExpandedIds(new Set());
    });
  }, [expandedIds.size]);

  useEffect(() => {
    if (!openColumn) return;
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest?.("[data-column-filter-popover]")) return;
      if (el.closest?.("[data-dv2-filter-trigger]")) return;
      setOpenColumn(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenColumn(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [openColumn]);

  const uniquesByColumn = useMemo(() => {
    const map = new Map<DistributionV2ColumnKey, string[]>();
    DISTRIBUTION_V2_COLUMNS.forEach((col) => {
      const set = new Set<string>();
      rowsBeforeColumnFilter.forEach((row) => {
        const v = getCellValue(row, col).trim();
        if (v) set.add(v);
      });
      const arr = Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
      map.set(col, arr);
    });
    return map;
  }, [rowsBeforeColumnFilter]);

  if (filteredRowCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft p-14 text-center">
        <p className="text-slate-500 text-sm font-medium">אין נתונים להצגה</p>
        <p className="text-slate-400 text-xs mt-2">התאם סינון או טווח תאריכים</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-hidden">
      {viewMode === "grouped" ? (
        <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            <span className="font-bold text-slate-800">קבוצה לפי {GROUP_BY_HINT[groupBy]}</span>
            <span className="text-slate-400 mx-1.5">·</span>
            שורה אחת לכל קבוצה — לחץ להרחבה
          </p>
          <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs font-semibold">
            {expandAllBlocked && (
              <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                בעמוד זה {totalRowsOnPage.toLocaleString("he-IL")} שורות — הרחב קבוצות בודדות
              </span>
            )}
            <button
              type="button"
              onClick={expandAllOnPage}
              disabled={isExpanding}
              className="text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-wait"
            >
              {isExpanding ? "פותח…" : "פתח הכל"}
            </button>
            <span className="text-slate-200">|</span>
            <button type="button" onClick={collapseAllOnPage} className="text-slate-500 hover:text-slate-800">
              סגור הכל
            </button>
            <span className="text-slate-200">|</span>
            <div className="relative shrink-0">
              <button
                ref={columnsMenuBtnRef}
                type="button"
                onClick={() => setColumnsMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                aria-expanded={columnsMenuOpen}
                aria-haspopup="dialog"
              >
                <Table2 className="w-3.5 h-3.5" />
                עמודות
              </button>
              {columnsMenuOpen && (
                <ColumnsVisibilityPanel
                  ref={columnsMenuRef}
                  columnOrder={columnOrder}
                  hiddenSet={hiddenSet}
                  visibleColumnOrder={visibleColumnOrder}
                  onToggle={toggleColumnVisible}
                  onShowAll={showAllColumns}
                />
              )}
            </div>
            <span className="text-slate-200">|</span>
            <button
              type="button"
              onClick={() => setColumnOrder([...DISTRIBUTION_V2_COLUMNS])}
              className="text-slate-500 hover:text-slate-800 text-xs"
              title="החזר סדר עמודות לברירת מחדל"
            >
              איפוס סדר עמודות
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-slate-600">
            <span className="font-bold text-slate-800">תצוגה רגילה</span>
            <span className="text-slate-400 mx-1.5">·</span>
            כל שורה בנפרד (ממוין לפי הקיבוץ שנבחר)
          </p>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative">
              <button
                ref={columnsMenuBtnRef}
                type="button"
                onClick={() => setColumnsMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                aria-expanded={columnsMenuOpen}
                aria-haspopup="dialog"
              >
                <Table2 className="w-3.5 h-3.5" />
                עמודות
              </button>
              {columnsMenuOpen && (
                <ColumnsVisibilityPanel
                  ref={columnsMenuRef}
                  columnOrder={columnOrder}
                  hiddenSet={hiddenSet}
                  visibleColumnOrder={visibleColumnOrder}
                  onToggle={toggleColumnVisible}
                  onShowAll={showAllColumns}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => setColumnOrder([...DISTRIBUTION_V2_COLUMNS])}
              className="text-slate-500 hover:text-slate-800 text-xs"
              title="החזר סדר עמודות לברירת מחדל"
            >
              איפוס סדר עמודות
            </button>
          </div>
        </div>
      )}
      {hasActiveColumnFilters && (
        <div className="px-5 py-2.5 bg-amber-50/90 border-b border-amber-100/80 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-amber-900">פילטר עמודות</span>
          <button
            type="button"
            onClick={onClearColumnFilters}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
          >
            איפוס
          </button>
        </div>
      )}
      <div
        className="overflow-x-auto rounded-b-2xl"
        role="region"
        aria-label="טבלת נתוני חלוקה"
      >
        <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleColumnOrder} strategy={horizontalListSortingStrategy}>
            <table className="w-full text-[13px] text-right border-collapse min-w-[960px]" role="table">
              <thead>
                <tr className="border-b border-slate-200">
                  {visibleColumnOrder.map((col) => (
                    <SortableTh
                      key={col}
                      col={col}
                      label={COLUMN_LABELS[col]}
                      isSorted={sortColumn === col}
                      sortDir={sortColumn === col ? sortDirection : undefined}
                      onSort={() => onSort(col)}
                    />
                  ))}
                </tr>
                <tr className="border-b border-slate-200">
                  {visibleColumnOrder.map((col) => (
                    <th
                      key={col}
                      className="sticky top-[2.75rem] z-[13] bg-[#fafbfc] p-1.5 border-s border-slate-100 first:border-s-0 align-middle shadow-[0_4px_6px_-2px_rgba(15,23,42,0.06)]"
                    >
                      <ColumnFilterCell
                        col={col}
                        label={COLUMN_LABELS[col]}
                        isOpen={openColumn === col}
                        onOpen={() => setOpenColumn(col)}
                        hasPicklist={(columnPicklists[col]?.length ?? 0) > 0}
                        hasText={Boolean(columnFilters[col]?.trim())}
                        allValues={uniquesByColumn.get(col) ?? []}
                        columnFilters={columnFilters}
                        columnPicklists={columnPicklists}
                        onColumnFilter={onColumnFilter}
                        onColumnPicklist={onColumnPicklist}
                        onClose={() => setOpenColumn(null)}
                        popoverRef={openColumn === col ? popoverRef : undefined}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
          <tbody>
            {summaryStats &&
              (() => {
                const firstCol = visibleColumnOrder[0];
                return (
                  <tr className="bg-slate-800 text-white border-b-2 border-slate-600" aria-label="שורת סיכום כללי">
                    {visibleColumnOrder.map((col) => {
                      if (col === firstCol) {
                        return (
                          <td key={col} className="px-3 py-1.5 text-xs font-bold align-middle">
                            <span className="text-white whitespace-nowrap">סיכום כללי</span>
                            <span className="text-slate-400 font-normal mr-2 text-[11px] hidden sm:inline">
                              · {summaryStats.storeCount.toLocaleString("he-IL")} חנויות · {summaryStats.periodCount} חודשים · {summaryStats.productCount} מוצרים
                            </span>
                          </td>
                        );
                      }
                      if (col === "quantity") {
                        return (
                          <td key={col} className="px-2.5 py-1.5 text-xs font-bold tabular-nums text-white whitespace-nowrap">
                            {summaryStats.totalQuantity.toLocaleString("he-IL")}
                          </td>
                        );
                      }
                      if (col === "returns") {
                        return (
                          <td key={col} className="px-2.5 py-1.5 text-xs font-bold tabular-nums text-white whitespace-nowrap">
                            {summaryStats.totalReturns.toLocaleString("he-IL")}
                          </td>
                        );
                      }
                      if (col === "returnsPct") {
                        return (
                          <td key={col} className="px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-300 whitespace-nowrap">
                            {summaryStats.returnsPctWeighted.toLocaleString("he-IL")}%
                          </td>
                        );
                      }
                      if (col === "sales") {
                        return (
                          <td key={col} className="px-2.5 py-1.5 text-xs font-bold tabular-nums text-emerald-200 whitespace-nowrap">
                            ₪{summaryStats.totalSales.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      }
                      return (
                        <td key={col} className="px-2.5 py-1.5 text-slate-500 text-[11px] whitespace-nowrap">
                          —
                        </td>
                      );
                    })}
                  </tr>
                );
              })()}
            {viewMode === "flat"
              ? displayRows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={[
                      "border-b border-slate-100/90 transition-colors hover:bg-slate-50/80",
                      i % 2 === 1 ? "bg-[#fafbfc]" : "bg-white",
                    ].join(" ")}
                  >
                    <DetailCells row={row} columnOrder={visibleColumnOrder} noAccent />
                  </tr>
                ))
              : groupBlocks.map((block) => {
              const expanded = expandedIds.has(block.id);
              return (
                <Fragment key={block.id}>
                  <tr className="bg-gradient-to-l from-slate-100/95 to-slate-50/90 border-b border-slate-200 hover:from-slate-100 hover:to-slate-50 transition-colors">
                    <td colSpan={visibleColumnOrder.length} className="px-4 py-3 align-middle border-s-4 border-s-primary-500/35">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          onClick={() => toggleGroup(block.id)}
                          className="flex items-center gap-2.5 text-right rounded-xl px-1 py-0.5 hover:bg-white/70 min-w-0 transition-colors"
                          aria-expanded={expanded}
                          aria-label={expanded ? "צמצם קבוצה" : "הרחב קבוצה"}
                        >
                          <ChevronDown
                            className={`w-5 h-5 shrink-0 text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : "-rotate-90"}`}
                          />
                          <span className="font-bold text-[0.95rem] text-slate-900 tracking-tight truncate max-w-[min(100%,26rem)]">
                            {block.label}
                          </span>
                        </button>
                        {block.subLabel && (
                          <span className="text-[11px] font-medium text-slate-500 bg-white/60 px-2 py-0.5 rounded-md border border-slate-200/60">
                            {block.subLabel}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500 tabular-nums">
                          {block.rowCount.toLocaleString("he-IL")} שורות
                        </span>
                        <span className="text-xs text-slate-500">{block.uniqueStoreCount} חנויות</span>
                        <span className="text-xs text-slate-500">{block.periodCount} חודשים</span>
                        <span className="mr-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold text-slate-800 tabular-nums">
                          <span className="text-slate-600 font-semibold">כמות</span>
                          {block.totalQuantity.toLocaleString("he-IL")}
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-600 font-semibold">חזרות</span>
                          {block.totalReturns.toLocaleString("he-IL")}
                          <span className="text-slate-300">|</span>
                          <span className="text-emerald-700">
                            ₪
                            {block.totalSales.toLocaleString("he-IL", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expanded &&
                    block.rows.map((row, i) => (
                      <tr
                        key={`${block.id}-${row.id}`}
                        className={[
                          "border-b border-slate-100/90 transition-colors hover:bg-slate-50/80",
                          i % 2 === 1 ? "bg-[#fafbfc]" : "bg-white",
                        ].join(" ")}
                      >
                        <DetailCells row={row} columnOrder={visibleColumnOrder} />
                      </tr>
                    ))}
                </Fragment>
              );
            })
            }
          </tbody>
        </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={[
        "px-2.5 py-1.5 text-slate-700 align-middle border-s border-slate-100 first:border-s-0 text-[12px] leading-tight",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}

function formatCellValue(row: DistributionV2Row, col: DistributionV2ColumnKey): React.ReactNode {
  const v = row[col];
  if (v === undefined || v === null) return "—";
  if (col === "sales" && typeof v === "number") {
    return `₪${v.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if ((col === "quantity" || col === "returns") && typeof v === "number") {
    return v.toLocaleString("he-IL");
  }
  if (col === "returnsPct" && typeof v === "number") {
    return `${v.toLocaleString("he-IL")}%`;
  }
  return String(v);
}

function DetailCells({
  row,
  columnOrder,
  noAccent,
}: {
  row: DistributionV2Row;
  columnOrder: DistributionV2ColumnKey[];
  noAccent?: boolean;
}) {
  return (
    <>
      {columnOrder.map((col) => {
        const content = formatCellValue(row, col);
        const raw = getCellValue(row, col);
        const useTruncate = TRUNCATE_TEXT_COLS.includes(col) && raw.length > 0;
        return (
          <Td key={col} className={getTdClassForColumn(col, noAccent)}>
            {useTruncate ? (
              <span className="block truncate whitespace-nowrap" title={raw} dir="auto">
                {content}
              </span>
            ) : (
              content
            )}
          </Td>
        );
      })}
    </>
  );
}

interface ColumnFilterCellProps {
  col: DistributionV2ColumnKey;
  label: string;
  isOpen: boolean;
  onOpen: () => void;
  hasPicklist: boolean;
  hasText: boolean;
  allValues: string[];
  columnFilters: ColumnFiltersState;
  columnPicklists: ColumnPicklistsState;
  onColumnFilter: (column: DistributionV2ColumnKey, value: string) => void;
  onColumnPicklist: (column: DistributionV2ColumnKey, values: string[]) => void;
  onClose: () => void;
  popoverRef?: React.RefObject<HTMLDivElement>;
}

function ColumnFilterCell({
  col,
  label,
  isOpen,
  onOpen,
  hasPicklist,
  hasText,
  allValues,
  columnFilters,
  columnPicklists,
  onColumnFilter,
  onColumnPicklist,
  onClose,
  popoverRef,
}: ColumnFilterCellProps) {
  const [draftPick, setDraftPick] = useState<Set<string>>(new Set());
  const [draftText, setDraftText] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 280, maxHeight: 360 });

  const active = hasPicklist || hasText;

  const syncDraftFromProps = useCallback(() => {
    const p = columnPicklists[col];
    setDraftPick(p && p.length ? new Set(p) : new Set());
    setDraftText(columnFilters[col] ?? "");
    setListSearch("");
  }, [col, columnFilters, columnPicklists]);

  useEffect(() => {
    if (isOpen) syncDraftFromProps();
  }, [isOpen, syncDraftFromProps]);

  const openPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = (e.currentTarget as HTMLButtonElement).closest("button");
    if (btn) {
      const r = btn.getBoundingClientRect();
      const margin = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(320, Math.max(260, vw - 2 * margin));
      let left = r.right - w;
      if (left < margin) left = margin;
      if (left + w > vw - margin) left = vw - w - margin;

      const capH = Math.min(380, Math.floor(vh * 0.72));
      const spaceBelow = vh - r.bottom - margin;
      const spaceAbove = r.top - margin;
      const minUseful = 140;

      let top: number;
      let maxHeight: number;

      if (spaceBelow >= minUseful) {
        top = r.bottom + margin;
        maxHeight = Math.min(capH, spaceBelow);
      } else if (spaceAbove >= minUseful) {
        maxHeight = Math.min(capH, spaceAbove);
        top = r.top - maxHeight - margin;
      } else {
        maxHeight = Math.max(minUseful, vh - 2 * margin);
        top = margin;
      }

      if (top < margin) top = margin;
      if (top + maxHeight > vh - margin) {
        maxHeight = Math.max(minUseful, vh - margin - top);
      }
      if (maxHeight < minUseful && vh > minUseful + 2 * margin) {
        maxHeight = vh - 2 * margin;
        top = margin;
      }

      setPosition({ top, left, width: w, maxHeight });
    }
    onOpen();
  };

  const filteredValues = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return allValues;
    return allValues.filter((v) => v.toLowerCase().includes(q));
  }, [allValues, listSearch]);

  const displayValues = filteredValues.slice(0, MAX_UNIQUE_IN_LIST);
  const truncated = filteredValues.length > MAX_UNIQUE_IN_LIST;

  const apply = () => {
    onColumnPicklist(col, Array.from(draftPick));
    onColumnFilter(col, draftText);
    onClose();
  };

  const clearColumn = () => {
    onColumnPicklist(col, []);
    onColumnFilter(col, "");
    onClose();
  };

  const toggle = (v: string) => {
    setDraftPick((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  };

  const selectAllVisible = () => {
    setDraftPick((prev) => {
      const n = new Set(prev);
      displayValues.forEach((v) => n.add(v));
      return n;
    });
  };

  return (
    <>
      <button
        type="button"
        data-dv2-filter-trigger
        onClick={openPopover}
        className={[
          "w-full min-w-[4.25rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-all shadow-sm",
          active
            ? "bg-primary-50 border-primary-300 text-primary-800 ring-1 ring-primary-200/50"
            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700",
        ].join(" ")}
        title={`סינון חכם — ${label}`}
      >
        <Filter className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[5rem]">סנן</span>
      </button>

      {isOpen &&
        popoverRef &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              role="presentation"
              aria-hidden
              className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-[2px]"
              onClick={onClose}
            />
            <div
              ref={popoverRef}
              data-column-filter-popover
              role="dialog"
              aria-modal="true"
              aria-labelledby="column-filter-title"
              className="fixed z-[200] rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col min-h-0 overflow-hidden"
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
          <div id="column-filter-title" className="shrink-0 px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-800">סינון: {label}</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="shrink-0 px-3 py-2 border-b border-slate-100 space-y-2">
            <label className="block text-xs text-slate-500">חיפוש בתוך רשימת הערכים</label>
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="הקלד לסינון הרשימה..."
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
            <label className="block text-xs text-slate-500">מכיל טקסט (בתא)</label>
            <input
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="למשל חלק משם..."
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-slate-500">
                {displayValues.length} ערכים
                {truncated ? ` (מתוך ${filteredValues.length})` : ""}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="text-xs text-primary-600 hover:underline"
                >
                  סמן את המוצגים
                </button>
                <button
                  type="button"
                  onClick={() => setDraftPick(new Set())}
                  className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
                >
                  בטל הכל
                </button>
              </div>
            </div>
            <ul className="space-y-0.5">
              {displayValues.length === 0 ? (
                <li className="text-sm text-slate-400 px-2 py-4 text-center">אין ערכים תואמים</li>
              ) : (
                displayValues.map((v) => (
                  <li key={v}>
                    <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={draftPick.has(v)}
                        onChange={() => toggle(v)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="truncate flex-1 text-right" title={v}>
                        {v.length > 60 ? `${v.slice(0, 60)}…` : v}
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="shrink-0 px-3 py-2 border-t border-slate-100 flex gap-2 justify-end flex-wrap">
            <button
              type="button"
              onClick={clearColumn}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              נקה עמודה
            </button>
            <button
              type="button"
              onClick={apply}
              className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              החל
            </button>
          </div>
        </div>
          </>,
          document.body,
        )}
    </>
  );
}
