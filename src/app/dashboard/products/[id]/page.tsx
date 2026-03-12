"use client";

import dynamic from "next/dynamic";
import { useProductDetail } from "@/hooks/useProductDetail";
import { useProductMonthlyDeliveries } from "@/hooks/useProductMonthlyDeliveries";
import { useAuth } from "@/hooks/useAuth";
import { Button, EmptyState } from "@/components/ui";
import {
  ProductDetailHeader,
  ProductMetricsRow,
  ProductSummaryCards,
  ProductMonthlySalesTable,
  ProductStoresTable,
} from "@/components/product-detail";

const ProductSalesChart = dynamic(
  () => import("@/components/product-detail/ProductSalesChart").then((m) => m.ProductSalesChart),
  { ssr: false },
);
const ProductStoresDonut = dynamic(
  () => import("@/components/product-detail/ProductStoresDonut").then((m) => m.ProductStoresDonut),
  { ssr: false },
);

export default function ProductDetailPage() {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const {
    product,

    // State
    selectedYear,
    setSelectedYear,
    availableYears,
    currentYear,
    previousYear,
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
    productStoresLoading,
    chartData,

    // Navigation
    goToProductsList,
  } = useProductDetail();

  const { deliveries: deliveryCountByPeriod } = useProductMonthlyDeliveries(
    product?.name,
    companyId,
  );

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
      <ProductSummaryCards product={product} currentYear={currentYear} previousYear={previousYear} />

      {/* Monthly Sales Table */}
      <ProductMonthlySalesTable
        productName={product.name}
        monthlyData={monthlyData}
        totals={totals}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={availableYears}
        hideHolidays={hideHolidays}
        onHideHolidaysChange={setHideHolidays}
        deliveryCountByPeriod={deliveryCountByPeriod}
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
        isLoading={productStoresLoading}
        currentYear={currentYear}
        previousYear={previousYear}
      />
    </div>
  );
}
