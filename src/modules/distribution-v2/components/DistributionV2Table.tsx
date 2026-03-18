"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Filter, X } from "lucide-react";
import type {
  DistributionV2Row,
  DistributionV2ColumnKey,
  ColumnFiltersState,
  ColumnPicklistsState,
  DistributionV2GroupBlock,
  GroupByMode,
} from "../types";
import { DISTRIBUTION_V2_COLUMNS } from "../types";

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

const GROUP_BY_HINT: Record<GroupByMode, string> = {
  products: "מוצר",
  customers: "חנות / לקוח",
  drivers: "נהג",
};

interface DistributionV2TableProps {
  groupBlocks: DistributionV2GroupBlock[];
  groupBy: GroupByMode;
  filteredRowCount: number;
  rowsBeforeColumnFilter: DistributionV2Row[];
  columnFilters: ColumnFiltersState;
  columnPicklists: ColumnPicklistsState;
  onColumnFilter: (column: DistributionV2ColumnKey, value: string) => void;
  onColumnPicklist: (column: DistributionV2ColumnKey, values: string[]) => void;
  onClearColumnFilters: () => void;
  hasActiveColumnFilters: boolean;
}

export function DistributionV2Table({
  groupBlocks,
  groupBy,
  filteredRowCount,
  rowsBeforeColumnFilter,
  columnFilters,
  columnPicklists,
  onColumnFilter,
  onColumnPicklist,
  onClearColumnFilters,
  hasActiveColumnFilters,
}: DistributionV2TableProps) {
  const [openColumn, setOpenColumn] = useState<DistributionV2ColumnKey | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const popoverRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    setExpandedIds(new Set());
  }, [groupBy]);

  const toggleGroup = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllOnPage = () => {
    setExpandedIds(new Set(groupBlocks.map((g) => g.id)));
  };

  const collapseAllOnPage = () => setExpandedIds(new Set());

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
      <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
          <span className="font-bold text-slate-800">קבוצה לפי {GROUP_BY_HINT[groupBy]}</span>
          <span className="text-slate-400 mx-1.5">·</span>
          שורה אחת לכל קבוצה — לחץ להרחבה
        </p>
        <div className="flex items-center gap-3 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={expandAllOnPage}
            className="text-primary-600 hover:text-primary-700"
          >
            פתח הכל
          </button>
          <span className="text-slate-200">|</span>
          <button type="button" onClick={collapseAllOnPage} className="text-slate-500 hover:text-slate-800">
            סגור הכל
          </button>
        </div>
      </div>
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
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] text-right border-collapse min-w-[960px]">
          <thead className="sticky top-0 z-[8]">
            <tr className="bg-[#f4f6f9] border-b border-slate-200">
              {DISTRIBUTION_V2_COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-3 py-3 text-xs font-bold text-slate-600 tracking-wide whitespace-nowrap border-s border-slate-200/80 first:border-s-0"
                >
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
            <tr className="bg-[#fafbfc] border-b border-slate-200">
              {DISTRIBUTION_V2_COLUMNS.map((col) => (
                <th key={col} className="p-2 border-s border-slate-100 first:border-s-0 align-middle">
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
            {groupBlocks.map((block) => {
              const expanded = expandedIds.has(block.id);
              return (
                <Fragment key={block.id}>
                  <tr className="bg-gradient-to-l from-slate-100/95 to-slate-50/90 border-b border-slate-200 hover:from-slate-100 hover:to-slate-50 transition-colors">
                    <td colSpan={DISTRIBUTION_V2_COLUMNS.length} className="px-4 py-3 align-middle border-s-4 border-s-primary-500/35">
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
                        <DetailCells row={row} />
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={[
        "px-3 py-2.5 text-slate-700 align-middle border-s border-slate-100 first:border-s-0 text-[13px] leading-snug",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}

function DetailCells({ row }: { row: DistributionV2Row }) {
  return (
    <>
      <Td className="border-s-[3px] border-s-primary-400/25 font-medium text-slate-800">{row.month ?? "—"}</Td>
      <Td className="tabular-nums whitespace-nowrap">{row.periodDate ?? "—"}</Td>
      <Td className="tabular-nums">{row.customerId ?? "—"}</Td>
      <Td className="max-w-[14rem]">{row.customer ?? "—"}</Td>
      <Td>{row.network ?? "—"}</Td>
      <Td>{row.city ?? "—"}</Td>
      <Td className="tabular-nums">{row.productId ?? "—"}</Td>
      <Td className="max-w-[14rem]">{row.product ?? "—"}</Td>
      <Td>{row.productCategory ?? "—"}</Td>
      <Td className="font-medium tabular-nums">{row.quantity.toLocaleString("he-IL")}</Td>
      <Td className="tabular-nums">{row.returns.toLocaleString("he-IL")}</Td>
      <Td className="tabular-nums font-semibold text-slate-900">
        {row.sales != null
          ? `₪${row.sales.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—"}
      </Td>
      <Td>{row.driver ?? "—"}</Td>
      <Td>{row.agent ?? "—"}</Td>
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
          <div
            ref={popoverRef}
            data-column-filter-popover
            className="fixed z-[200] rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col min-h-0 overflow-hidden"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            dir="rtl"
          >
          <div className="shrink-0 px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
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
              <button
                type="button"
                onClick={selectAllVisible}
                className="text-xs text-primary-600 hover:underline"
              >
                סמן את המוצגים
              </button>
            </div>
            <ul className="space-y-0.5">
              {displayValues.length === 0 ? (
                <li className="text-sm text-slate-400 px-2 py-4 text-center">אין ערכים תואמים</li>
              ) : (
                displayValues.map((v) => (
                  <li key={v.slice(0, 80)}>
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
        </div>,
          document.body,
        )}
    </>
  );
}
