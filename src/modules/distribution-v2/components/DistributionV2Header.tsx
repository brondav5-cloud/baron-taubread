"use client";

import { useState } from "react";
import { Filter, RefreshCw, FileSpreadsheet, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { UseDistributionV2Return, GroupByMode, DistributionViewMode } from "../types";
import { exportDistributionV2ToExcel } from "../utils/exportDistributionV2Excel";

interface DistributionV2HeaderProps {
  hook: UseDistributionV2Return;
  onToggleFilters: () => void;
  filtersOpen: boolean;
  activeFiltersCount: number;
}

const GROUP_LABELS: Record<GroupByMode, string> = {
  products: "לפי מוצרים",
  customers: "לפי לקוחות",
  drivers: "לפי נהגים",
};

export function DistributionV2Header({
  hook,
  onToggleFilters,
  filtersOpen,
  activeFiltersCount,
}: DistributionV2HeaderProps) {
  const { totalRows, groupCount, groupBy, setGroupBy, viewMode, setViewMode, isLoading, refetch, rows } = hook;
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      await exportDistributionV2ToExcel(rows);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-bold text-slate-900 tracking-tight leading-tight">
            נתוני חלוקה
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium tabular-nums">
            <span className="text-slate-700">{totalRows.toLocaleString("he-IL")}</span>
            {" שורות"}
            <span className="text-slate-300 mx-2">·</span>
            <span className="text-slate-700">{groupCount.toLocaleString("he-IL")}</span>
            {" קבוצות"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-soft">
          <button
            type="button"
            onClick={refetch}
            disabled={isLoading}
            aria-label="רענון נתונים"
            className={clsx(
              "p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-colors",
              isLoading && "animate-spin text-primary-600",
            )}
          >
            <RefreshCw className="w-[1.125rem] h-[1.125rem]" />
          </button>
          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? "סגור סינון" : "פתח סינון"}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/40",
              filtersOpen
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
            )}
          >
            <Filter className="w-4 h-4 opacity-90" />
            סינון
            {activeFiltersCount > 0 && (
              <span
                className={clsx(
                  "min-w-[1.25rem] h-5 px-1 rounded-md text-xs font-bold flex items-center justify-center",
                  filtersOpen ? "bg-white/20" : "bg-primary-600 text-white",
                )}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={rows.length === 0 || exporting}
            aria-label="ייצוא לאקסל"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-0.5">
          {(["flat", "grouped"] as DistributionViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                viewMode === mode
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {mode === "flat" ? "תצוגה רגילה" : "תצוגה מקובצת"}
            </button>
          ))}
        </div>
        {viewMode === "grouped" && (
          <>
            <span className="text-xs font-semibold text-slate-400 pl-1 hidden sm:inline">קבץ לפי</span>
            {(Object.keys(GROUP_LABELS) as GroupByMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setGroupBy(mode)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                  groupBy === mode
                    ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/80",
                )}
              >
                {GROUP_LABELS[mode]}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
