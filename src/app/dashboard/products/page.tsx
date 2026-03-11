"use client";

import { useProductsPageSupabase } from "@/hooks/useProductsPageSupabase";
import {
  ProductsHeaderSupabase,
  ProductsTableSupabase,
  ProductsSearchBar,
  ProductsFiltersPanel,
  ProductsPagination,
  ProductsTotalsBar,
} from "@/components/products-supabase";
import { LoadingState } from "@/components/common";

export default function ProductsPage() {
  const hook = useProductsPageSupabase();

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
    currentYear,
  } = hook;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState message="טוען מוצרים מהשרת..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          שגיאה בטעינת מוצרים
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

  if (hook.totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          אין מוצרים עדיין
        </h2>
        <p className="text-gray-600">העלה קובץ Excel כדי להוסיף מוצרים</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProductsHeaderSupabase hook={hook} />

      <ProductsFiltersPanel
        show={showFilters}
        filters={filters}
        filterOptions={filterOptions}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        activeFiltersCount={activeFiltersCount}
        currentYear={currentYear}
      />

      <ProductsSearchBar value={search} onChange={setSearch} />

      <ProductsTotalsBar
        totals={totals}
        viewMode={viewMode}
        metricsPeriodLabels={hook.metricsPeriodLabels}
      />

      <ProductsTableSupabase hook={hook} />

      {filteredCount > 0 && (
        <ProductsPagination
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
