"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  calculateAvailablePeriods,
  getLastNPeriods,
  type AvailablePeriods,
} from "@/lib/periodUtils";
import type { DataMetadata } from "@/types/supabase";

// ============================================
// TYPES
// ============================================

export type PeriodType = "year" | "half" | "quarter" | "custom";

export interface PeriodSelection {
  type: PeriodType;
  key: string; // "2025" | "2025-H2" | "2025-Q4" | "custom"
  label: string; // "2025" | "H2 2025" | "Q4 2025" | "3 חודשים"
  months: string[]; // ["202501", "202502", ...]
}

export interface ComparePeriodSelection extends PeriodSelection {
  enabled: boolean;
}

export interface PeriodSelectorState {
  // Current selection
  primary: PeriodSelection;
  compare: ComparePeriodSelection;

  // Available options (calculated from data)
  available: AvailablePeriods;

  // Display mode for comparison
  displayMode: "rows" | "columns";
}

export type DefaultPeriodType = "last6" | "last12" | "currentYear" | "lastHalf";

// ============================================
// DEFAULT SELECTION CALCULATOR
// ============================================

function getDefaultSelection(
  monthsList: string[],
  defaultType: DefaultPeriodType,
): PeriodSelection {
  if (!monthsList || monthsList.length === 0) {
    return {
      type: "custom",
      key: "empty",
      label: "אין נתונים",
      months: [],
    };
  }

  const sorted = [...monthsList].sort();

  switch (defaultType) {
    case "last6": {
      const months = getLastNPeriods(sorted, 6);
      return {
        type: "custom",
        key: "last6",
        label: "6 חודשים אחרונים",
        months,
      };
    }

    case "last12": {
      const months = getLastNPeriods(sorted, 12);
      return {
        type: "custom",
        key: "last12",
        label: "12 חודשים אחרונים",
        months,
      };
    }

    case "currentYear": {
      const lastPeriod = sorted[sorted.length - 1];
      const currentYear = lastPeriod
        ? parseInt(lastPeriod.slice(0, 4), 10)
        : new Date().getFullYear();
      const yearMonths = sorted.filter((p) =>
        p.startsWith(String(currentYear)),
      );
      return {
        type: "year",
        key: String(currentYear),
        label: String(currentYear),
        months: yearMonths,
      };
    }

    case "lastHalf":
    default: {
      const months = getLastNPeriods(sorted, 6);
      const lastPeriod = months[months.length - 1];
      const year = lastPeriod
        ? parseInt(lastPeriod.slice(0, 4), 10)
        : new Date().getFullYear();
      const lastMonth = lastPeriod ? parseInt(lastPeriod.slice(4), 10) : 12;
      const half = lastMonth <= 6 ? 1 : 2;

      return {
        type: "half",
        key: `${year}-H${half}`,
        label: `H${half} ${year}`,
        months,
      };
    }
  }
}

// ============================================
// HOOK
// ============================================

interface UsePeriodSelectorOptions {
  metadata: DataMetadata | null;
  defaultType?: DefaultPeriodType;
}

export function usePeriodSelector({
  metadata,
  defaultType = "lastHalf",
}: UsePeriodSelectorOptions) {
  // Get months list from metadata
  const monthsList = metadata?.months_list || [];
  const monthsKey = monthsList.join(","); // Stable key for dependency

  // Calculate available periods from metadata
  const available = useMemo(() => {
    return calculateAvailablePeriods(monthsList);
  }, [monthsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // State
  const [primary, setPrimary] = useState<PeriodSelection>({
    type: "custom",
    key: "empty",
    label: "טוען...",
    months: [],
  });

  const [compare, setCompare] = useState<ComparePeriodSelection>({
    type: "custom",
    key: "compare",
    label: "בחר תקופה",
    months: [],
    enabled: false,
  });

  const [displayMode, setDisplayMode] = useState<"rows" | "columns">("columns");

  // Track if we've initialized
  const initializedRef = useRef(false);

  // Update primary when metadata first becomes available
  useEffect(() => {
    if (monthsList.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      const newDefault = getDefaultSelection(monthsList, defaultType);
      setPrimary(newDefault);
    }
  }, [monthsKey, defaultType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // SELECTION HANDLERS
  // ============================================

  const selectYear = useCallback(
    (year: number) => {
      const yearData = available.years.find((y) => y.year === year);
      if (!yearData) return;

      setPrimary({
        type: "year",
        key: String(year),
        label: String(year),
        months: yearData.months,
      });
    },
    [available.years],
  );

  const selectHalf = useCallback(
    (year: number, half: 1 | 2) => {
      const halfData = available.halves.find(
        (h) => h.year === year && h.half === half,
      );
      if (!halfData) return;

      setPrimary({
        type: "half",
        key: halfData.key,
        label: halfData.label,
        months: halfData.months,
      });
    },
    [available.halves],
  );

  const selectQuarter = useCallback(
    (year: number, quarter: 1 | 2 | 3 | 4) => {
      const quarterData = available.quarters.find(
        (q) => q.year === year && q.quarter === quarter,
      );
      if (!quarterData) return;

      setPrimary({
        type: "quarter",
        key: quarterData.key,
        label: quarterData.label,
        months: quarterData.months,
      });
    },
    [available.quarters],
  );

  const selectMonths = useCallback(
    (months: string[]) => {
      setPrimary({
        type: "custom",
        key: "custom",
        label:
          months.length === 1
            ? available.months.find((m) => m.key === months[0])?.label ||
              "1 חודש"
            : `${months.length} חודשים`,
        months: [...months].sort(),
      });
    },
    [available.months],
  );

  const toggleMonth = useCallback(
    (monthKey: string) => {
      setPrimary((prev) => {
        // If current selection is a preset (not custom), clicking any month
        // should clear the preset and start fresh with just that month
        if (prev.type !== "custom") {
          const monthLabel =
            available.months.find((m) => m.key === monthKey)?.label || "1 חודש";
          return {
            type: "custom",
            key: "custom",
            label: monthLabel,
            months: [monthKey],
          };
        }

        const isSelected = prev.months.includes(monthKey);
        const newMonths = isSelected
          ? prev.months.filter((m) => m !== monthKey)
          : [...prev.months, monthKey].sort();

        if (newMonths.length === 0) return prev;

        return {
          type: "custom",
          key: "custom",
          label:
            newMonths.length === 1
              ? available.months.find((m) => m.key === newMonths[0])?.label ||
                "1 חודש"
              : `${newMonths.length} חודשים`,
          months: newMonths,
        };
      });
    },
    [available.months],
  );

  // Clear primary selection and start fresh
  const clearPrimary = useCallback(() => {
    setPrimary({
      type: "custom",
      key: "custom",
      label: "בחר תקופה",
      months: [],
    });
  }, []);

  // ============================================
  // COMPARE HANDLERS
  // ============================================

  const enableCompare = useCallback(() => {
    // Start with empty selection - user will choose
    setCompare({
      type: "custom",
      key: "compare",
      label: "בחר תקופה",
      months: [],
      enabled: true,
    });
  }, []);

  const disableCompare = useCallback(() => {
    setCompare({
      type: "custom",
      key: "compare",
      label: "בחר תקופה",
      months: [],
      enabled: false,
    });
  }, []);

  const setComparePeriod = useCallback((selection: PeriodSelection) => {
    setCompare({
      ...selection,
      enabled: true,
    });
  }, []);

  const selectCompareYear = useCallback(
    (year: number) => {
      const yearData = available.years.find((y) => y.year === year);
      if (!yearData) return;

      setCompare({
        type: "year",
        key: String(year),
        label: String(year),
        months: yearData.months,
        enabled: true,
      });
    },
    [available.years],
  );

  const selectCompareHalf = useCallback(
    (year: number, half: 1 | 2) => {
      const halfData = available.halves.find(
        (h) => h.year === year && h.half === half,
      );
      if (!halfData) return;

      setCompare({
        type: "half",
        key: halfData.key,
        label: halfData.label,
        months: halfData.months,
        enabled: true,
      });
    },
    [available.halves],
  );

  const selectCompareQuarter = useCallback(
    (year: number, quarter: 1 | 2 | 3 | 4) => {
      const quarterData = available.quarters.find(
        (q) => q.year === year && q.quarter === quarter,
      );
      if (!quarterData) return;

      setCompare({
        type: "quarter",
        key: quarterData.key,
        label: quarterData.label,
        months: quarterData.months,
        enabled: true,
      });
    },
    [available.quarters],
  );

  const selectCompareMonths = useCallback(
    (months: string[]) => {
      setCompare({
        type: "custom",
        key: "custom",
        label:
          months.length === 1
            ? available.months.find((m) => m.key === months[0])?.label ||
              "1 חודש"
            : `${months.length} חודשים`,
        months: [...months].sort(),
        enabled: true,
      });
    },
    [available.months],
  );

  const toggleCompareMonth = useCallback(
    (monthKey: string) => {
      setCompare((prev) => {
        const isSelected = prev.months.includes(monthKey);
        const newMonths = isSelected
          ? prev.months.filter((m) => m !== monthKey)
          : [...prev.months, monthKey].sort();

        if (newMonths.length === 0) return prev;

        return {
          type: "custom",
          key: "custom",
          label:
            newMonths.length === 1
              ? available.months.find((m) => m.key === newMonths[0])?.label ||
                "1 חודש"
              : `${newMonths.length} חודשים`,
          months: newMonths,
          enabled: true,
        };
      });
    },
    [available.months],
  );

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    primary,
    compare,
    available,
    displayMode,

    // Metrics period info (for headers)
    metricsPeriodInfo: metadata
      ? {
          metricsPeriodStart:
            metadata.metrics_period_start || metadata.period_start,
          metricsPeriodEnd: metadata.metrics_period_end || metadata.period_end,
          metricsMonths: metadata.metrics_months || metadata.months_list,
        }
      : null,

    // Primary selection
    selectYear,
    selectHalf,
    selectQuarter,
    selectMonths,
    toggleMonth,
    setPrimary,
    clearPrimary,

    // Compare
    enableCompare,
    disableCompare,
    setComparePeriod,
    selectCompareYear,
    selectCompareHalf,
    selectCompareQuarter,
    selectCompareMonths,
    toggleCompareMonth,

    // Display
    setDisplayMode,
  };
}

export type UsePeriodSelectorReturn = ReturnType<typeof usePeriodSelector>;
