"use client";

import { useProductDetail } from "@/hooks/useProductDetail";
import { Button, EmptyState } from "@/components/ui";
import {
  ProductDetailHeader,
  ProductMetricsRow,
  ProductSummaryCards,
  ProductMonthlySalesTable,
  ProductSalesChart,
  ProductStoresDonut,
  ProductStoresTable,
} from "@/components/product-detail";

export default function ProductDetailPage() {
  const {
    product,

    // State
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,
    storeSearch,
    setStoreSearch,
    monthSelection,
    setMonthSelection,

    // Computed data
    monthlyData,
    totals,
    topStores,
    filteredStores,
    chartData,

    // Navigation
    goToProductsList,
  } = useProductDetail();

  // Not found state
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <EmptyState
          variant="error"
          title="המוצר לא נמצא"
          description="המוצר המבוקש לא קיים במערכת"
          action={
            <Button onClick={goToProductsList}>חזרה לרשימת מוצרים</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ProductDetailHeader
        product={product}
        monthSelection={monthSelection}
        onMonthSelectionChange={setMonthSelection}
      />

      {/* Metrics Row */}
      <ProductMetricsRow product={product} />

      {/* Summary Cards */}
      <ProductSummaryCards product={product} />

      {/* Monthly Sales Table */}
      <ProductMonthlySalesTable
        productName={product.name}
        monthlyData={monthlyData}
        totals={totals}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        hideHolidays={hideHolidays}
        onHideHolidaysChange={setHideHolidays}
      />

      {/* Sales Chart */}
      <ProductSalesChart data={chartData} />

      {/* Stores Donut */}
      <ProductStoresDonut stores={topStores} />

      {/* Stores Table */}
      <ProductStoresTable
        stores={filteredStores}
        search={storeSearch}
        onSearchChange={setStoreSearch}
      />
    </div>
  );
}
