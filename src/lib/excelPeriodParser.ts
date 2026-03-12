import type { ExcelRow, ParsedPeriod } from "@/types/supabase";

/**
 * Parse period string like "1 - 2025" to structured data
 */
export function parsePeriod(periodStr: string): ParsedPeriod | null {
  // Handle formats: "1 - 2025", "01/2025", "2025-01"
  const patterns = [
    /^(\d{1,2})\s*-\s*(\d{4})$/, // "1 - 2025"
    /^(\d{1,2})\/(\d{4})$/, // "01/2025"
    /^(\d{4})-(\d{1,2})$/, // "2025-01"
  ];

  for (const pattern of patterns) {
    const match = periodStr.trim().match(pattern);
    if (match && match[1] && match[2]) {
      const isYearFirst = pattern === patterns[2];
      const month = parseInt(isYearFirst ? match[2] : match[1], 10);
      const year = parseInt(isYearFirst ? match[1] : match[2], 10);

      if (month >= 1 && month <= 12 && year >= 2020 && year <= 2100) {
        const key = `${year}${String(month).padStart(2, "0")}`;
        return { month, year, key };
      }
    }
  }

  return null;
}

/**
 * Get all unique periods sorted
 */
export function extractPeriods(rows: ExcelRow[]): string[] {
  const periodsSet = new Set<string>();

  for (const row of rows) {
    const periodVal = row["חודש ושנה"] ?? row["חודש"] ?? "";
    const period = parsePeriod(String(periodVal));
    if (period) {
      periodsSet.add(period.key);
    }
  }

  return Array.from(periodsSet).sort();
}
