"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter, X } from "lucide-react";
import type {
  DistributionV2Row,
  DistributionV2ColumnKey,
  ColumnFiltersState,
  ColumnPicklistsState,
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

interface DistributionV2TableProps {
  rows: DistributionV2Row[];
  rowsBeforeColumnFilter: DistributionV2Row[];
  columnFilters: ColumnFiltersState;
  columnPicklists: ColumnPicklistsState;
  onColumnFilter: (column: DistributionV2ColumnKey, value: string) => void;
  onColumnPicklist: (column: DistributionV2ColumnKey, values: string[]) => void;
  onClearColumnFilters: () => void;
  hasActiveColumnFilters: boolean;
}

export function DistributionV2Table({
  rows,
  rowsBeforeColumnFilter,
  columnFilters,
  columnPicklists,
  onColumnFilter,
  onColumnPicklist,
  onClearColumnFilters,
  hasActiveColumnFilters,
}: DistributionV2TableProps) {
  const [openColumn, setOpenColumn] = useState<DistributionV2ColumnKey | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null!);

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

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
        אין נתונים להצגה. התאם סינון או טווח תאריכים.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {hasActiveColumnFilters && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-amber-900 font-medium">סינון עמודות פעיל</span>
          <button
            type="button"
            onClick={onClearColumnFilters}
            className="text-sm text-amber-800 hover:text-amber-950 underline"
          >
            איפוס כל פילטרי העמודות
          </button>
        </div>
      )}
      <div className="overflow-x-auto max-h-[min(70vh,900px)] overflow-y-auto">
        <table className="w-full text-sm text-right border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 border-b border-slate-300">
              {DISTRIBUTION_V2_COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap border-s border-slate-200 first:border-s-0"
                >
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200">
              {DISTRIBUTION_V2_COLUMNS.map((col) => (
                <th key={col} className="p-1.5 border-s border-slate-100 first:border-s-0 align-top">
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
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={[
                  "border-b border-slate-100 transition-colors hover:bg-primary-50/40",
                  i % 2 === 1 ? "bg-slate-50/50" : "bg-white",
                ].join(" ")}
              >
                <Td>{row.month ?? "—"}</Td>
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
                <Td className="tabular-nums font-medium text-slate-900">
                  {row.sales != null ? `₪${row.sales.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                </Td>
                <Td>{row.driver ?? "—"}</Td>
                <Td>{row.agent ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={["px-3 py-2 text-slate-800 align-middle border-s border-slate-100 first:border-s-0", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 280 });

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
      const w = Math.min(320, Math.max(260, window.innerWidth - 24));
      let left = r.right - w;
      if (left < 8) left = 8;
      if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
      let top = r.bottom + 6;
      const maxH = 360;
      if (top + maxH > window.innerHeight - 8) top = Math.max(8, r.top - maxH - 6);
      setPosition({ top, left, width: w });
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
          "w-full min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
          active
            ? "bg-primary-100 border-primary-300 text-primary-900"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300",
        ].join(" ")}
        title={`סינון חכם — ${label}`}
      >
        <Filter className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[5rem]">סנן</span>
      </button>

      {isOpen && popoverRef && (
        <div
          ref={popoverRef}
          data-column-filter-popover
          className="fixed z-[100] rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col max-h-[min(380px,70vh)]"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
          }}
          dir="rtl"
        >
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
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

          <div className="px-3 py-2 border-b border-slate-100 space-y-2">
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

          <div className="px-3 py-2 border-t border-slate-100 flex gap-2 justify-end flex-wrap">
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
      )}
    </>
  );
}
