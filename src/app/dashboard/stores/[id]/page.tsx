"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  StoreWeeklyTab,
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
  "weekly",
  "pricing",
  "competitors",
];

function periodToMonthKey(period: string): string {
  // "202601" → "2026-01"
  if (period.length === 6) return `${period.slice(0, 4)}-${period.slice(4)}`;
  return period;
}

export default function StoreDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<StoreTabType>("overview");
  const [jumpToMonth, setJumpToMonth] = useState<string | undefined>();

  useEffect(() => {
    const tab = searchParams.get("tab") as StoreTabType | null;
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tab: StoreTabType) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.push(`?${query}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleMonthClick = (period: string) => {
    setJumpToMonth(periodToMonthKey(period));
    handleTabChange("products");
  };

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

  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

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
      <StoreDetailHeader store={store} />
      <StoreTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === "overview" && (
        <>
          <StoreMetricsCards
            metrics={store.metrics}
            metricsPeriodInfo={metricsPeriodInfo}
          />
          <StoreSummaryCards
            selectedYear={selectedYear}
            currentYearTotals={currentYearTotals}
            previousYearTotals={previousYearTotals}
          />
          <StoreDeliverySummary
            summary={storeDelivery}
            isLoading={isLoadingDeliveries}
          />
          <StoreSalesChart data={chartData} onBarClick={handleMonthClick} />
          <StoreMonthlyTable
            yearMonthlyData={yearMonthlyData}
            currentYearTotals={currentYearTotals}
            selectedYear={selectedYear}
            availableYears={availableYears}
            onYearChange={setSelectedYear}
            onMonthClick={handleMonthClick}
          />
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
          companyId={companyId}
          storeExternalId={store?.external_id ?? null}
          initialMonthlyMonth={jumpToMonth}
        />
      )}

      {activeTab === "weekly" && store && (
        <StoreWeeklyTab storeExternalId={store.external_id} />
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
    </div>
  );
}
