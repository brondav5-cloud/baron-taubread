"use client";

import {
  useProfitabilityPage,
  PROFIT_TYPE_LABELS,
} from "@/hooks/useProfitabilityPage";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  ProfitabilityHeader,
  ProfitabilityFilters,
  ProfitabilityTableNew,
  ProfitabilitySelectedBar,
  ProfitabilityOverview,
  ProfitabilityPeriodSelector,
} from "@/components/profitability";

export default function ProfitabilityPage() {
  const { periodLabel } = useSupabaseData();
  const {
    profitType,
    setProfitType,
    showFilters,
    setShowFilters,
    filters,
    sortField,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    selectedIds,
    period,
    setPeriod,
    cities,
    networks,
    agents,
    drivers,
    hasCosts,
    paginatedStores,
    totals,
    selectedSummary,
    totalPages,
    activeFiltersCount,
    toggleSort,
    updateFilter,
    clearFilters,
    toggleSelection,
    selectAllVisible,
    clearSelection,
    goToCompare,
    getProfit,
    getMargin,
  } = useProfitabilityPage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <ProfitabilityHeader
        profitType={profitType}
        onProfitTypeChange={setProfitType}
        showFilters={showFilters}
        onToggleFilters={setShowFilters}
        activeFiltersCount={activeFiltersCount}
        hasCosts={hasCosts}
        periodSubtitle={periodLabel}
      />

      {/* Period Selector */}
      <ProfitabilityPeriodSelector period={period} onChange={setPeriod} />

      {/* Overview Cards */}
      <ProfitabilityOverview
        totalStores={totals.count}
        totalSales={totals.sales}
        totalQty={totals.qty}
        totalProfit={totals.profit}
        avgMargin={totals.avgMargin}
        profitableStores={totals.profitableStores}
        profitTypeLabel={PROFIT_TYPE_LABELS[profitType]}
      />

      {/* Filters */}
      <ProfitabilityFilters
        show={showFilters}
        filters={filters}
        cities={cities}
        networks={networks}
        agents={agents}
        drivers={drivers}
        activeFiltersCount={activeFiltersCount}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
      />

      {/* Table */}
      <ProfitabilityTableNew
        stores={paginatedStores}
        totals={totals}
        selectedIds={selectedIds}
        sortField={sortField}
        profitType={profitType}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        onToggleSort={toggleSort}
        onToggleSelection={toggleSelection}
        onSelectAll={selectAllVisible}
        onClearSelection={clearSelection}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        getProfit={getProfit}
        getMargin={getMargin}
      />

      {/* Selected Bar */}
      <ProfitabilitySelectedBar
        selectedCount={selectedIds.size}
        summary={selectedSummary}
        onClear={clearSelection}
        onCompare={goToCompare}
      />
    </div>
  );
}
