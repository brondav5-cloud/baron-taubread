import type { StoreStatus } from "@/types";
import { STATUS_THRESHOLDS, MONTHS } from "./constants";

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with thousands separator (Hebrew locale)
 */
export function formatNumber(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format currency in ILS
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: { showSymbol?: boolean; compact?: boolean } = {},
): string {
  const { showSymbol = true, compact = false } = options;

  if (amount === null || amount === undefined) return "-";

  if (compact && Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    return showSymbol ? `₪${millions.toFixed(1)}M` : `${millions.toFixed(1)}M`;
  }

  if (compact && Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    return showSymbol
      ? `₪${thousands.toFixed(0)}K`
      : `${thousands.toFixed(0)}K`;
  }

  const formatted = formatNumber(Math.abs(amount));
  const prefix = amount < 0 ? "-" : "";

  return showSymbol ? `${prefix}₪${formatted}` : `${prefix}${formatted}`;
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number | null | undefined,
  options: { decimals?: number; showSign?: boolean } = {},
): string {
  const { decimals = 1, showSign = false } = options;

  if (value === null || value === undefined) return "-";

  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

// ============================================
// DATE FORMATTING
// ============================================

/**
 * Format date to Hebrew string
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: "short" | "long" | "time" | "datetime" = "short",
): string {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "-";

  switch (format) {
    case "short":
      return d.toLocaleDateString("he-IL");
    case "long":
      return d.toLocaleDateString("he-IL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    case "time":
      return d.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "datetime":
      return `${formatDate(d, "short")} ${formatDate(d, "time")}`;
    default:
      return d.toLocaleDateString("he-IL");
  }
}

/**
 * Format period string (YYYYMM) to Hebrew
 */
export function formatPeriod(period: string | null | undefined): string {
  if (!period || period.length !== 6) return "-";

  const year = period.substring(0, 4);
  const monthNum = parseInt(period.substring(4, 6), 10);
  const month = MONTHS.find((m) => m.value === monthNum);

  return month ? `${month.label} ${year}` : period;
}

/**
 * Format period string (YYYYMM) to short Hebrew
 */
export function formatPeriodShort(period: string | null | undefined): string {
  if (!period || period.length !== 6) return "-";

  const year = period.substring(2, 4);
  const monthNum = parseInt(period.substring(4, 6), 10);
  const month = MONTHS.find((m) => m.value === monthNum);

  return month ? `${month.short}'${year}` : period;
}

/**
 * Get relative time string (Hebrew)
 */
export function getRelativeTime(
  date: string | Date | null | undefined,
): string {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "עכשיו";
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;

  return formatDate(d, "short");
}

/**
 * Create period string from year and month
 */
export function createPeriod(year: number, month: number): string {
  return `${year}${month.toString().padStart(2, "0")}`;
}

/**
 * Parse period string to year and month
 */
export function parsePeriod(
  period: string,
): { year: number; month: number } | null {
  if (!period || period.length !== 6) return null;

  const year = parseInt(period.substring(0, 4), 10);
  const month = parseInt(period.substring(4, 6), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;

  return { year, month };
}

// ============================================
// STATUS HELPERS
// ============================================

/**
 * Calculate status from 12v12 metric value
 */
export function getStatusFromMetric(
  value: number | null | undefined,
): StoreStatus {
  if (value === null || value === undefined) return "new";

  if (value >= STATUS_THRESHOLDS.RISING) return "rising";
  if (value >= STATUS_THRESHOLDS.GROWTH) return "growth";
  if (value >= STATUS_THRESHOLDS.STABLE) return "stable";
  if (value >= STATUS_THRESHOLDS.DECLINE) return "decline";

  return "crash";
}

// ============================================
// STRING HELPERS
// ============================================

/**
 * Truncate text with ellipsis
 */
export function truncate(
  text: string | null | undefined,
  maxLength = 50,
): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Generate initials from name
 */
export function getInitials(
  name: string | null | undefined,
  maxChars = 2,
): string {
  if (!name) return "?";

  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .slice(0, maxChars)
    .join("");
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================
// ARRAY HELPERS
// ============================================

/**
 * Group array by key
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Sort array by multiple keys
 */
export function sortBy<T>(
  array: T[],
  ...keys: Array<keyof T | ((item: T) => number | string)>
): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      const aVal = typeof key === "function" ? key(a) : a[key];
      const bVal = typeof key === "function" ? key(b) : b[key];

      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

/**
 * Remove duplicates by key
 */
export function uniqueBy<T>(array: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if string is valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is valid Israeli phone
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^0[2-9]\d{7,8}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ""));
}

// ============================================
// MISC HELPERS
// ============================================

/**
 * Delay execution (for loading states, etc.)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key in source) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[Extract<keyof T, string>];
    } else {
      result[key] = sourceVal as T[Extract<keyof T, string>];
    }
  }

  return result;
}
