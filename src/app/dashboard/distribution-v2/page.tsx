"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useDistributionV2Data,
  DistributionV2Header,
  DistributionV2FiltersBar,
  DistributionV2ActiveFiltersChips,
  DistributionV2KpiBar,
  DistributionV2Table,
  DistributionV2Pagination,
} from "@/modules/distribution-v2";
import { LoadingState } from "@/components/common";
import type { DistributionV2Filters } from "@/modules/distribution-v2/types";

export default function DistributionV2Page() {
  const hook = useDistributionV2Data();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFiltersCount = useMemo(() => {
    const f = hook.filters;
    let n = 0;
    if (f.dateFrom) n++;
    if (f.dateTo) n++;
    if (f.cities.length) n++;
    if (f.networks.length) n++;
    if (f.drivers.length) n++;
    if (f.agents.length) n++;
    if (f.search.trim()) n++;
    return n;
  }, [hook.filters]);

  const setFilters = hook.setFilters;
  const handleFilterUpdate = useCallback(
    (key: keyof DistributionV2Filters, value: string | string[]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters(() => ({
      dateFrom: "",
      dateTo: "",
      cities: [],
      networks: [],
      drivers: [],
      agents: [],
      search: "",
    }));
  }, [setFilters]);

  const removeCity = useCallback((city: string) => {
    setFilters((prev) => ({ ...prev, cities: prev.cities.filter((c) => c !== city) }));
  }, [setFilters]);
  const removeNetwork = useCallback((network: string) => {
    setFilters((prev) => ({ ...prev, networks: prev.networks.filter((n) => n !== network) }));
  }, [setFilters]);
  const removeDriver = useCallback((driver: string) => {
    setFilters((prev) => ({ ...prev, drivers: prev.drivers.filter((d) => d !== driver) }));
  }, [setFilters]);
  const removeAgent = useCallback((agent: string) => {
    setFilters((prev) => ({ ...prev, agents: prev.agents.filter((a) => a !== agent) }));
  }, [setFilters]);

  if (hook.isLoading && hook.rows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[420px] font-assistant">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft px-10 py-12 text-center max-w-md">
          <LoadingState message="טוען נתונים..." />
          <p className="text-slate-500 text-sm mt-4">מכין את רשימת החלוקה</p>
        </div>
      </div>
    );
  }

  if (hook.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] text-center font-assistant">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-soft px-10 py-12 max-w-md">
          <p className="text-red-600 font-semibold mb-2">שגיאה בטעינת הנתונים</p>
          <p className="text-slate-600 text-sm mb-6">{hook.error}</p>
          <button
            type="button"
            onClick={hook.refetch}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1920px] mx-auto pb-2 font-assistant antialiased" dir="rtl">
      {hook.dataLastDate && (
        <div className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-2xl border border-slate-200/90 bg-slate-50/80 text-sm font-medium text-slate-700 shadow-sm">
          <span className="text-slate-500">הנתונים כולל עד תאריך</span>
          <span className="font-bold text-slate-900 tabular-nums">{hook.dataLastDate}</span>
          <span className="text-slate-400 text-xs hidden sm:inline">(תאריך אחרון בנתונים)</span>
        </div>
      )}
      <DistributionV2Header
        hook={hook}
        onToggleFilters={() => setFiltersOpen((v) => !v)}
        filtersOpen={filtersOpen}
        activeFiltersCount={activeFiltersCount}
      />

      <DistributionV2FiltersBar
        open={filtersOpen}
        filters={hook.filters}
        options={hook.filterOptions}
        onUpdate={handleFilterUpdate}
        onClear={handleClearFilters}
        activeCount={activeFiltersCount}
      />

      <DistributionV2ActiveFiltersChips
        filters={hook.filters}
        onRemoveDateFrom={() => handleFilterUpdate("dateFrom", "")}
        onRemoveDateTo={() => handleFilterUpdate("dateTo", "")}
        onRemoveCity={removeCity}
        onRemoveNetwork={removeNetwork}
        onRemoveDriver={removeDriver}
        onRemoveAgent={removeAgent}
        onRemoveSearch={() => handleFilterUpdate("search", "")}
        onClearAll={handleClearFilters}
      />

      <DistributionV2KpiBar summaryStats={hook.summaryStats} />

      <DistributionV2Table
        viewMode={hook.viewMode}
        displayRows={hook.displayRows}
        groupBlocks={hook.displayGroupBlocks}
        groupBy={hook.groupBy}
        filteredRowCount={hook.totalRows}
        summaryStats={hook.summaryStats}
        rowsBeforeColumnFilter={hook.rowsBeforeColumnFilter}
        columnFilters={hook.columnFilters}
        columnPicklists={hook.columnPicklists}
        onColumnFilter={hook.setColumnFilter}
        onColumnPicklist={hook.setColumnPicklist}
        onClearColumnFilters={hook.clearColumnFilters}
        hasActiveColumnFilters={
          Object.values(hook.columnFilters).some((v) => v != null && String(v).trim() !== "") ||
          Object.values(hook.columnPicklists).some((arr) => (arr?.length ?? 0) > 0)
        }
      />

      {hook.totalRows > 0 && (
        <DistributionV2Pagination
          currentPage={hook.currentPage}
          totalPages={hook.totalPages}
          pageSize={hook.pageSize}
          totalItems={hook.totalItems}
          pageUnitLabel={hook.viewMode === "flat" ? "שורות" : "קבוצות"}
          onPageChange={hook.setCurrentPage}
          onPageSizeChange={hook.setPageSize}
        />
      )}
    </div>
  );
}
