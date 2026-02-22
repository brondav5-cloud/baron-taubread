"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getDeliveriesByPeriod } from "@/lib/db/deliveries.repo";
import type { DbStore, DataMetadata } from "@/types/supabase";
export const MONTHS = [
  "ינו",
  "פבר",
  "מרץ",
  "אפר",
  "מאי",
  "יונ",
  "יול",
  "אוג",
  "ספט",
  "אוק",
  "נוב",
  "דצמ",
];
export const DONUT_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];

// ============================================
// TYPES
// ============================================

export interface StoreMonthlyRow {
  period: string; // "202401"
  periodLabel: string; // "ינו 24"
  year: number;
  month: number;
  gross: number;
  qty: number;
  returns: number;
  sales: number;
  returnsPct: number;
  deliveries: number; // מספר תעודות משלוח מהטבלה store_deliveries
}

export interface YearlyTotals {
  year: number;
  gross: number;
  qty: number;
  returns: number;
  sales: number;
  returnsPct: number;
  deliveries: number;
}

export interface StoreChartData {
  period: string;
  label: string;
  gross: number;
  qty: number;
  returns: number;
}

// ============================================
// HELPERS
// ============================================

function getMonthLabel(period: string): string {
  const year = period.slice(2, 4);
  const month = parseInt(period.slice(4), 10);
  return `${MONTHS[month - 1]} ${year}`;
}

function calculateYearlyTotals(
  monthlyData: StoreMonthlyRow[],
  year: number,
): YearlyTotals {
  const yearData = monthlyData.filter((m) => m.year === year);
  const totals = yearData.reduce(
    (acc, m) => ({
      gross: acc.gross + m.gross,
      qty: acc.qty + m.qty,
      returns: acc.returns + m.returns,
      sales: acc.sales + m.sales,
      deliveries: acc.deliveries + (m.deliveries ?? 0),
    }),
    { gross: 0, qty: 0, returns: 0, sales: 0, deliveries: 0 },
  );

  return {
    year,
    ...totals,
    returnsPct: totals.gross > 0 ? (totals.returns / totals.gross) * 100 : 0,
  };
}

// ============================================
// HOOK
// ============================================

export function useStoreDetailSupabase() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const storeId = params.id as string;

  // State
  const [store, setStore] = useState<DbStore | null>(null);
  const [metadata, setMetadata] = useState<DataMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Load store from Supabase
  useEffect(() => {
    if (auth.status === "loading" || !companyId) {
      setIsLoading(false);
      setStore(null);
      setMetadata(null);
      setError(null);
      return;
    }
    if (!storeId) return;

    async function loadStore() {
      if (!companyId) return;
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const isExternalId = /^\d+$/.test(storeId);

        let storeData: DbStore | null = null;

        if (isExternalId) {
          // URL has external_id (e.g. from VisitDetailModal, StoreVisitsHistory)
          const extId = parseInt(storeId, 10);
          const { data, error: storeError } = await supabase
            .from("stores")
            .select("*")
            .eq("company_id", companyId)
            .eq("external_id", extId)
            .single();
          if (storeError) {
            setError("החנות לא נמצאה");
            setStore(null);
            setIsLoading(false);
            return;
          }
          storeData = data;
        } else {
          // URL has UUID (id)
          const { data, error: storeError } = await supabase
            .from("stores")
            .select("*")
            .eq("id", storeId)
            .single();
          if (storeError) {
            setError("החנות לא נמצאה");
            setStore(null);
            setIsLoading(false);
            return;
          }
          storeData = data;
        }

        setStore(storeData);

        // Fetch metadata
        const { data: metaData } = await supabase
          .from("data_metadata")
          .select("*")
          .eq("company_id", companyId)
          .single();

        if (metaData) {
          setMetadata(metaData);
          // Set default year to current year from metadata
          if (metaData.current_year) {
            setSelectedYear(metaData.current_year);
          }
        }
      } catch (err) {
        console.error("Error:", err);
        setError("שגיאה בטעינת נתונים");
      } finally {
        setIsLoading(false);
      }
    }

    loadStore();
  }, [auth.status, companyId, storeId]);

  // Deliveries per month (from store_deliveries)
  const [deliveriesByPeriod, setDeliveriesByPeriod] = useState<
    Record<string, number>
  >({});
  const storeExtId = store?.external_id;
  const monthsList = useMemo(
    () => metadata?.months_list ?? [],
    [metadata?.months_list],
  );
  const monthsListKey = monthsList.join(",");

  useEffect(() => {
    if (!companyId || !store || monthsList.length === 0) {
      setDeliveriesByPeriod({});
      return;
    }
    const extId = store.external_id;
    getDeliveriesByPeriod(companyId, monthsList).then((rows) => {
      const map: Record<string, number> = {};
      rows
        .filter((r) => r.store_external_id === extId)
        .forEach((r) => {
          map[r.period] = (map[r.period] ?? 0) + r.deliveries_count;
        });
      setDeliveriesByPeriod(map);
    });
  }, [companyId, store, storeExtId, monthsList, monthsListKey]);

  // Available years from metadata
  const availableYears = useMemo((): number[] => {
    if (!metadata?.months_list?.length) return [2024, 2025];
    const years = new Set<number>();
    metadata.months_list.forEach((p) => {
      const year = parseInt(p.slice(0, 4), 10);
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [metadata]);

  // Monthly data for table
  const monthlyData = useMemo((): StoreMonthlyRow[] => {
    if (!store || !metadata?.months_list?.length) return [];

    const sortedPeriods = [...metadata.months_list].sort();

    return sortedPeriods.map((period) => {
      const year = parseInt(period.slice(0, 4), 10);
      const month = parseInt(period.slice(4), 10);
      const gross = store.monthly_gross?.[period] || 0;
      const qty = store.monthly_qty?.[period] || 0;
      const returns = store.monthly_returns?.[period] || 0;
      const sales = store.monthly_sales?.[period] || 0;
      const deliveries = deliveriesByPeriod[period] ?? 0;

      return {
        period,
        periodLabel: getMonthLabel(period),
        year,
        month,
        gross,
        qty,
        returns,
        sales,
        returnsPct: gross > 0 ? (returns / gross) * 100 : 0,
        deliveries,
      };
    });
  }, [store, metadata, deliveriesByPeriod]);

  // Filtered by selected year
  const yearMonthlyData = useMemo(() => {
    return monthlyData.filter((m) => m.year === selectedYear);
  }, [monthlyData, selectedYear]);

  // Yearly totals
  const yearlyTotals = useMemo((): YearlyTotals[] => {
    return availableYears.map((year) =>
      calculateYearlyTotals(monthlyData, year),
    );
  }, [monthlyData, availableYears]);

  // Current year totals
  const currentYearTotals = useMemo(() => {
    return yearlyTotals.find((t) => t.year === selectedYear) || null;
  }, [yearlyTotals, selectedYear]);

  // Previous year totals (for comparison)
  const previousYearTotals = useMemo(() => {
    return yearlyTotals.find((t) => t.year === selectedYear - 1) || null;
  }, [yearlyTotals, selectedYear]);

  // Chart data (last 12 months)
  const chartData = useMemo((): StoreChartData[] => {
    const last12 = monthlyData.slice(-12);
    return last12.map((m) => ({
      period: m.period,
      label: m.periodLabel,
      gross: m.gross,
      qty: m.qty,
      returns: m.returns,
    }));
  }, [monthlyData]);

  // Navigation
  const goToStoresList = () => router.push("/dashboard/stores");

  return {
    // Identifiers
    storeId,
    store,

    // Loading state
    isLoading,
    error,

    // Metadata
    metadata,
    availableYears,

    // State
    selectedYear,
    setSelectedYear,

    // Computed data
    monthlyData,
    yearMonthlyData,
    yearlyTotals,
    currentYearTotals,
    previousYearTotals,
    chartData,

    // Navigation
    goToStoresList,

    // For period labels in metrics
    metricsPeriodInfo: metadata
      ? {
          metricsPeriodStart:
            metadata.metrics_period_start || metadata.period_start,
          metricsPeriodEnd: metadata.metrics_period_end || metadata.period_end,
          metricsMonths: metadata.metrics_months || metadata.months_list || [],
        }
      : null,
  };
}

export type UseStoreDetailSupabaseReturn = ReturnType<
  typeof useStoreDetailSupabase
>;
