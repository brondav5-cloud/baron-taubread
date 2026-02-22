"use client";

import { useStoresPageSupabase } from "@/hooks/useStoresPageSupabase";
import {
  StoresHeaderSupabase,
  StoresTableSupabase,
  StoresSearchBar,
  StoresFiltersPanel,
  StoresPagination,
  StoresTotalsBar,
} from "@/components/stores-supabase";
import { LoadingState } from "@/components/common";

export default function StoresPage() {
  const hook = useStoresPageSupabase();

  const {
    isLoading,
    error,
    search,
    setSearch,
    showFilters,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    activeFiltersCount,
    totals,
    viewMode,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    changePageSize,
    filteredCount,
  } = hook;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState message="טוען נתונים מהשרת..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          שגיאה בטעינת נתונים
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={hook.refetch}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <StoresHeaderSupabase hook={hook} />

      {/* Filters Panel */}
      <StoresFiltersPanel
        show={showFilters}
        filters={filters}
        filterOptions={filterOptions}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Search Bar */}
      <StoresSearchBar value={search} onChange={setSearch} />

      {/* Totals Bar */}
      <StoresTotalsBar
        totals={totals}
        viewMode={viewMode}
        metricsPeriodLabels={hook.metricsPeriodLabels}
      />

      {/* Main Table */}
      <StoresTableSupabase hook={hook} />

      {/* Pagination */}
      {filteredCount > 0 && (
        <StoresPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={changePageSize}
        />
      )}
    </div>
  );
}
