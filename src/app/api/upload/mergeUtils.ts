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
 * Merge monthly data - keep existing + add new.
 * Existing data is preserved, only new months are added.
 */
export function mergeMonthlyData(
  existing: MonthlyData | null,
  newData: MonthlyData,
): MonthlyData {
  if (!existing) return { ...newData };

  const merged = { ...existing };

  for (const [month, value] of Object.entries(newData)) {
    if (!(month in merged)) {
      merged[month] = value;
    }
  }

  return merged;
}
