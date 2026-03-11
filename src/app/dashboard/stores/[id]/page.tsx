"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Users } from "lucide-react";
import { PdfReportModal, type PdfSection } from "@/components/ui";
import { useStoreDetailSupabase } from "@/hooks/useStoreDetailSupabase";
import { useStoreCityComparison } from "@/hooks/useStoreCityComparison";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStoreDeliveries } from "@/hooks/useStoreDeliveries";
import { LoadingState } from "@/components/common";
import {
  StoreDetailHeader,
  StoreMetricsCards,
  StoreSummaryCards,
  StoreMonthlyTable,
  StoreTabs,
  TabPlaceholder,
  StoreCityComparison,
  StoreProductsTab,
} from "@/components/store-detail-supabase";

const StoreSalesChart = dynamic(
  () => import("@/components/store-detail-supabase/StoreSalesChart").then((m) => m.StoreSalesChart),
  { ssr: false },
);
import { StorePricingTab } from "@/components/store-detail";
import { StoreDeliverySummary } from "@/components/deliveries";
import type { StoreTabType } from "@/components/store-detail-supabase";

const VALID_TABS: StoreTabType[] = [
  "overview",
  "products",
  "pricing",
  "competitors",
];

const STORE_PDF_SECTIONS: PdfSection[] = [
  { id: "metrics", label: "📊 מדדי ביצועים (12v12, 6v6, 3v3, 2v2)" },
  { id: "summary", label: "💰 סיכום מכירות (כמות ומחזור)" },
  { id: "delivery", label: "🚚 סיכום אספקות" },
  { id: "chart", label: "📈 גרף מכירות חודשי" },
  { id: "monthly", label: "📅 טבלת מכירות חודשיות" },
  { id: "city", label: "📍 השוואת חנויות בעיר" },
];

export default function StoreDetailPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<StoreTabType>("overview");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const openPdfModal = useCallback(() => setShowPdfModal(true), []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && VALID_TABS.includes(tab as StoreTabType)) {
      setActiveTab(tab as StoreTabType);
    }
  }, [searchParams]);

  // Main store data
  const {
    store,
    isLoading,
    error,
    selectedYear,
    setSelectedYear,
    availableYears,
    yearMonthlyData,
    currentYearTotals,
    previousYearTotals,
    chartData,
    goToStoresList,
    metricsPeriodInfo,
  } = useStoreDetailSupabase();

  // City comparison (loads when store is ready)
  const city = useStoreCityComparison(store);

  // Products (loads when store is ready)
  const products = useStoreProducts(store);

  // Deliveries
  const { getStoreDelivery, isLoading: isLoadingDeliveries } =
    useStoreDeliveries();
  const storeDelivery = store ? getStoreDelivery(store.external_id) : undefined;

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState message="טוען פרטי חנות..." />
      </div>
    );
  }

  // Error / Not found
  if (error || !store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">החנות לא נמצאה</h2>
        <p className="text-gray-600 mb-4">החנות המבוקשת לא קיימת במערכת</p>
        <button
          onClick={goToStoresList}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          חזרה לרשימת חנויות
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StoreDetailHeader store={store} onPdfClick={openPdfModal} />
      <StoreTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && (
        <>
          <div id="pdf-section-metrics">
            <StoreMetricsCards
              metrics={store.metrics}
              metricsPeriodInfo={metricsPeriodInfo}
            />
          </div>
          <div id="pdf-section-summary">
            <StoreSummaryCards
              selectedYear={selectedYear}
              currentYearTotals={currentYearTotals}
              previousYearTotals={previousYearTotals}
            />
          </div>
          <div id="pdf-section-delivery">
            <StoreDeliverySummary
              summary={storeDelivery}
              isLoading={isLoadingDeliveries}
            />
          </div>
          <div id="pdf-section-chart">
            <StoreSalesChart data={chartData} />
          </div>
          <div id="pdf-section-monthly">
            <StoreMonthlyTable
              yearMonthlyData={yearMonthlyData}
              currentYearTotals={currentYearTotals}
              selectedYear={selectedYear}
              availableYears={availableYears}
              onYearChange={setSelectedYear}
            />
          </div>
          <div id="pdf-section-city">
            <StoreCityComparison
              store={store}
              cityStores={city.cityStores}
              rankings={city.rankings}
              cityAverages={city.cityAverages}
              isLoading={city.isLoading}
              sortKey={city.sortKey}
              sortDir={city.sortDir}
              onSort={city.handleSort}
              totalInCity={city.totalInCity}
              metricsPeriodInfo={metricsPeriodInfo}
            />
          </div>
        </>
      )}

      {activeTab === "products" && (
        <StoreProductsTab
          storeProducts={products.storeProducts}
          missingProducts={products.missingProducts}
          totalProducts={products.totalProducts}
          totalMissing={products.totalMissing}
          isLoading={products.isLoading}
          error={products.error}
          productSearch={products.productSearch}
          missingSearch={products.missingSearch}
          onProductSearchChange={products.setProductSearch}
          onMissingSearchChange={products.setMissingSearch}
        />
      )}

      {activeTab === "pricing" && store && (
        <StorePricingTab storeId={store.external_id} storeName={store.name} />
      )}
      {activeTab === "competitors" && (
        <TabPlaceholder
          icon={Users}
          label="מתחרים"
          settingsPath="/dashboard/settings/competitors"
        />
      )}

      {showPdfModal && (
        <PdfReportModal
          title={`דוח חנות: ${store.name}`}
          subtitle={store.city ?? undefined}
          sections={STORE_PDF_SECTIONS}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
