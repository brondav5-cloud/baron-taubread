"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useProductDetail } from "@/hooks/useProductDetail";
import { PdfReportModal, type PdfSection } from "@/components/ui";
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

const PRODUCT_PDF_SECTIONS: PdfSection[] = [
  { id: "metrics", label: "📊 מדדי ביצועים (12v12, 6v6, 3v3, 2v2)" },
  { id: "summary", label: "💰 כרטיסי סיכום (כמות ומחזור)" },
  { id: "monthly", label: "📅 טבלת מכירות חודשיות" },
  { id: "chart", label: "📈 גרף מכירות" },
  { id: "donut", label: "🥧 חלוקת חנויות TOP 10" },
  { id: "stores", label: "🏪 טבלת חנויות שמוכרות את המוצר" },
];

export default function ProductDetailPage() {
  const [showPdfModal, setShowPdfModal] = useState(false);
  const openPdfModal = useCallback(() => setShowPdfModal(true), []);
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
        onPdfClick={openPdfModal}
      />

      {/* Metrics Row */}
      <div id="pdf-section-metrics">
        <ProductMetricsRow product={product} />
      </div>

      {/* Summary Cards */}
      <div id="pdf-section-summary">
        <ProductSummaryCards product={product} />
      </div>

      {/* Monthly Sales Table */}
      <div id="pdf-section-monthly">
        <ProductMonthlySalesTable
          productName={product.name}
          monthlyData={monthlyData}
          totals={totals}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          availableYears={availableYears}
          hideHolidays={hideHolidays}
          onHideHolidaysChange={setHideHolidays}
        />
      </div>

      {/* Sales Chart */}
      <div id="pdf-section-chart">
        <ProductSalesChart data={chartData} />
      </div>

      {/* Stores Donut */}
      <div id="pdf-section-donut">
        <ProductStoresDonut stores={topStores} />
      </div>

      {/* Stores Table */}
      <div id="pdf-section-stores">
        <ProductStoresTable
          stores={filteredStores}
          search={storeSearch}
          onSearchChange={setStoreSearch}
          isLoading={productStoresLoading}
          currentYear={currentYear}
          previousYear={previousYear}
        />
      </div>

      {showPdfModal && (
        <PdfReportModal
          title={`דוח מוצר: ${product.name}`}
          subtitle={product.category ?? undefined}
          sections={PRODUCT_PDF_SECTIONS}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
