// ============================================
// USE STORE PROFITABILITY HOOK
// ============================================

import { useMemo } from "react";
import type { StoreWithStatus } from "@/types/data";
import { useProfitabilityData } from "@/hooks/useProfitabilityData";

// ============================================
// TYPES
// ============================================

export interface StoreProfitData {
  // האם יש עלויות מוגדרות
  hasCosts: boolean;
  hasDriverGroup: boolean;
  driverGroupName: string | null;

  // הכנסות
  revenue: number;

  // רווחים
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;

  // אחוזי רווח
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;

  // האם זה חישוב משוער
  isEstimated: boolean;
}

// ============================================
// DEFAULT MARGINS (for estimation)
// ============================================

const DEFAULT_MARGINS = {
  gross: 0.42, // 42% רווח גולמי
  operating: 0.35, // 35% רווח תפעולי
  net: 0.28, // 28% רווח נקי
};

// ============================================
// HOOK
// ============================================

export function useStoreProfitability(
  store: StoreWithStatus | null,
): StoreProfitData | null {
  const { hasCosts, ctx } = useProfitabilityData();
  return useMemo(() => {
    if (!store) return null;

    const revenue = store.sales_2025 || 0;
    const driverGroup = ctx.getDriverGroup(store.driver);
    const hasDriverGroup = driverGroup !== null;

    // אם אין עלויות מוגדרות - חישוב משוער
    if (!hasCosts) {
      return {
        hasCosts: false,
        hasDriverGroup,
        driverGroupName: driverGroup?.name ?? null,
        revenue,
        grossProfit: revenue * DEFAULT_MARGINS.gross,
        operatingProfit: revenue * DEFAULT_MARGINS.operating,
        netProfit: revenue * DEFAULT_MARGINS.net,
        grossMargin: DEFAULT_MARGINS.gross * 100,
        operatingMargin: DEFAULT_MARGINS.operating * 100,
        netMargin: DEFAULT_MARGINS.net * 100,
        isEstimated: true,
      };
    }

    // TODO: כאן יבוא חישוב אמיתי כשיהיו נתוני מכירות מפורטים לפי מוצר
    // כרגע משתמשים בחישוב משוער גם אם יש עלויות מוגדרות
    // כי אין לנו נתוני מכירות מפורטים לפי מוצר לכל חנות

    // חישוב משוער משופר (עם התחשבות בהחזרות)
    const returnsRate = store.returns_pct_last6 / 100;
    const adjustedGrossMargin = DEFAULT_MARGINS.gross * (1 - returnsRate * 0.5);
    const adjustedOperatingMargin =
      DEFAULT_MARGINS.operating * (1 - returnsRate * 0.5);
    const adjustedNetMargin = DEFAULT_MARGINS.net * (1 - returnsRate * 0.5);

    return {
      hasCosts: true,
      hasDriverGroup,
      driverGroupName: driverGroup?.name ?? null,
      revenue,
      grossProfit: revenue * adjustedGrossMargin,
      operatingProfit: revenue * adjustedOperatingMargin,
      netProfit: revenue * adjustedNetMargin,
      grossMargin: adjustedGrossMargin * 100,
      operatingMargin: adjustedOperatingMargin * 100,
      netMargin: adjustedNetMargin * 100,
      isEstimated: true, // עדיין משוער כי אין נתונים מפורטים
    };
  }, [store, hasCosts, ctx]);
}
