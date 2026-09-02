import type { MonthlyData } from "@/types/supabase";
import { shiftMonthKeyYYYYMM } from "@/lib/periods/monthShift";

export interface ActivityTotals {
  qty: number;
  sales: number;
  gross: number;
  returns: number;
  deliveries?: number;
}

export function hasActivity(totals: ActivityTotals | null | undefined): boolean {
  if (!totals) return false;
  return (
    totals.qty !== 0 ||
    totals.sales !== 0 ||
    totals.gross !== 0 ||
    totals.returns !== 0 ||
    (totals.deliveries ?? 0) !== 0
  );
}

export function storeHasActivityInMonths(
  maps: {
    monthly_qty?: MonthlyData | null;
    monthly_sales?: MonthlyData | null;
    monthly_gross?: MonthlyData | null;
    monthly_returns?: MonthlyData | null;
  },
  months: string[],
): boolean {
  return months.some((month) => {
    const qty = maps.monthly_qty?.[month] ?? 0;
    const sales = maps.monthly_sales?.[month] ?? 0;
    const gross = maps.monthly_gross?.[month] ?? 0;
    const returns = maps.monthly_returns?.[month] ?? 0;
    return qty !== 0 || sales !== 0 || gross !== 0 || returns !== 0;
  });
}

export function previousMonthBefore(months: string[]): string | null {
  const latest = [...months].filter((m) => /^\d{6}$/.test(m)).sort().pop();
  return latest ? shiftMonthKeyYYYYMM(latest, -1) : null;
}

/** Current calendar month in Asia/Jerusalem as YYYYMM. */
export function currentMonthKeyJerusalem(now = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `${ymd.slice(0, 4)}${ymd.slice(5, 7)}`;
}

/** True when the selected range still includes the open (incomplete) month. */
export function periodIncludesOpenMonth(
  months: string[],
  now = new Date(),
): boolean {
  const open = currentMonthKeyJerusalem(now);
  return months.some((month) => month === open);
}
