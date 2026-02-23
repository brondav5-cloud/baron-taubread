"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useDashboardSupabase } from "@/hooks/useDashboardSupabase";
import {
  DashboardHeader,
  OverviewCards,
  YearComparison,
  HalfYearComparison,
  MonthlySalesTable,
  TopBottomStores,
  CitySalesCards,
} from "@/components/dashboard";
import { LoadingSpinner } from "@/components/common";

const MonthlySalesChart = dynamic(
  () => import("@/components/dashboard/MonthlySalesChart").then((m) => m.MonthlySalesChart),
  { ssr: false },
);
const StatusDistributionPie = dynamic(
  () => import("@/components/dashboard/StatusDistributionPie").then((m) => m.StatusDistributionPie),
  { ssr: false },
);

export default function DashboardPage() {
  const {
    // Loading state
    isLoading,
    error,

    // State
    selectedYear,
    setSelectedYear,
    hideHolidays,
    setHideHolidays,

    // Dynamic periods
    availableYears,
    periodLabel,

    // Data
    stats,
    topStores,
    bottomStores,
    alertStores,
    statusDistribution,
    monthlyData,
    totals,
    halfYearData,
    citySales,
    chartData,
  } = useDashboardSupabase();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-500">טוען נתונים מהשרת...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">שגיאה בטעינת נתונים</p>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const hasData = stats.totalStores > 0 || stats.totalProducts > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        periodSubtitle={hasData ? periodLabel : undefined}
      />

      {/* Overview Cards */}
      <OverviewCards
        totalStores={stats.totalStores}
        totalProducts={stats.totalProducts}
        alertCount={alertStores.length}
        totals={totals}
        hasData={hasData}
      />

      {/* Empty state - no periods when no data */}
      {!hasData && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-lg font-medium text-gray-700">
            אין נתונים להצגה
          </p>
          <p className="mt-2 text-gray-500">
            התאריכים והתקופות יוצגו לאחר העלאת קובץ Excel בדף העלאת נתונים
          </p>
          <Link
            href="/dashboard/upload"
            className="mt-4 inline-block px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            עבור להעלאת נתונים
          </Link>
        </div>
      )}

      {/* Year Comparison - only when we have data */}
      {hasData && <YearComparison totals={totals} />}

      {/* Half Year Comparison - only when we have data */}
      {hasData && <HalfYearComparison data={halfYearData} />}

      {/* Monthly Sales Table - only when we have data */}
      {hasData && (
      <MonthlySalesTable
        monthlyData={monthlyData}
        totals={totals}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        hideHolidays={hideHolidays}
        onHideHolidaysChange={setHideHolidays}
        availableYears={availableYears}
      />
      )}

      {/* Monthly Sales Chart - only when we have data */}
      {hasData && <MonthlySalesChart data={chartData} />}

      {/* Top & Bottom Stores - only when we have data */}
      {hasData && (
        <TopBottomStores topStores={topStores} bottomStores={bottomStores} />
      )}

      {/* City Sales - only when we have data */}
      {hasData && <CitySalesCards cities={citySales} />}

      {/* Status Distribution - only when we have data */}
      {hasData && <StatusDistributionPie data={statusDistribution} />}
    </div>
  );
}
