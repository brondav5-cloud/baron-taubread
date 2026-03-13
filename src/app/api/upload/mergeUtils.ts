import type { MonthlyData } from "@/types/supabase";

/**
 * Normalize month string to "YYYY-MM".
 * - "YYYYMM" -> "YYYY-MM"
 * - "YYYY-MM" -> unchanged
 */
export function normalizeMonth(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{1,2}$/.test(trimmed)) return trimmed;
  if (/^\d{6}$/.test(trimmed))
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4)}`;
  return trimmed;
}

export function normalizeMonthsDetected(months: string[]): string[] {
  return Array.from(new Set(months.map(normalizeMonth))).sort();
}

/**
 * Merge monthly data — new upload data overwrites existing months.
 * Months NOT present in the new file are preserved from the DB.
 * Months present in the new file replace the stored value (allows corrections).
 */
export function mergeMonthlyData(
  existing: MonthlyData | null,
  newData: MonthlyData,
): MonthlyData {
  if (!existing) return { ...newData };
  // Spread order: existing first (preserves old months), then newData
  // (overwrites any matching months with the freshly-uploaded values).
  return { ...existing, ...newData };
}
