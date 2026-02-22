/**
 * Data Validation & Sanitization Utilities
 *
 * Handles edge cases in data like:
 * - Negative values (when returns > deliveries)
 * - Missing/null values
 * - Invalid data formats
 */

// ============================================
// TYPES
// ============================================

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: number;
}

export interface MonthlyDataIssue {
  period: string;
  field: string;
  value: number;
  issue: "negative" | "missing" | "invalid";
}

// ============================================
// VALUE SANITIZATION
// ============================================

/**
 * Sanitize a numeric value
 * - Returns 0 for negative values (optional)
 * - Returns 0 for null/undefined
 * - Returns rounded integer for display
 */
export function sanitizeNumber(
  value: number | null | undefined,
  options: {
    allowNegative?: boolean;
    round?: boolean;
    min?: number;
    max?: number;
  } = {},
): number {
  const { allowNegative = true, round = false, min, max } = options;

  // Handle null/undefined
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }

  let result = value;

  // Handle negative values
  if (!allowNegative && result < 0) {
    result = 0;
  }

  // Apply min/max bounds
  if (min !== undefined && result < min) {
    result = min;
  }
  if (max !== undefined && result > max) {
    result = max;
  }

  // Round if needed
  if (round) {
    result = Math.round(result);
  }

  return result;
}

/**
 * Sanitize percentage value (0-100 or allow negative for changes)
 */
export function sanitizePercentage(
  value: number | null | undefined,
  allowNegative = true,
): number {
  const sanitized = sanitizeNumber(value, { allowNegative });

  // Cap at reasonable bounds for display
  if (sanitized > 999) return 999;
  if (sanitized < -999) return -999;

  return sanitized;
}

// ============================================
// DATA VALIDATION
// ============================================

/**
 * Validate monthly data object
 */
export function validateMonthlyData(
  data: Record<string, number> | undefined,
): MonthlyDataIssue[] {
  const issues: MonthlyDataIssue[] = [];

  if (!data) return issues;

  for (const [period, value] of Object.entries(data)) {
    // Check for negative values
    if (value < 0) {
      issues.push({
        period,
        field: "qty",
        value,
        issue: "negative",
      });
    }

    // Check for suspiciously large values
    if (Math.abs(value) > 100000) {
      issues.push({
        period,
        field: "qty",
        value,
        issue: "invalid",
      });
    }
  }

  return issues;
}

/**
 * Check if store has data quality issues
 */
export function hasDataQualityIssues(store: {
  monthly_qty?: Record<string, number>;
  monthly_gross?: Record<string, number>;
  monthly_returns?: Record<string, number>;
}): boolean {
  const qtyIssues = validateMonthlyData(store.monthly_qty);
  const grossIssues = validateMonthlyData(store.monthly_gross);
  const returnsIssues = validateMonthlyData(store.monthly_returns);

  return (
    qtyIssues.length > 0 || grossIssues.length > 0 || returnsIssues.length > 0
  );
}

// ============================================
// NET CALCULATION (Gross - Returns)
// ============================================

/**
 * Calculate net value from gross and returns
 * Handles edge cases where returns > gross
 */
export function calculateNet(gross: number, returns: number): number {
  const net = gross - returns;

  // If net is negative (returns > gross), return 0 or the actual value
  // depending on business requirements
  return net;
}

/**
 * Calculate net for monthly data
 */
export function calculateMonthlyNet(
  gross: Record<string, number> | undefined,
  returns: Record<string, number> | undefined,
): Record<string, number> {
  const result: Record<string, number> = {};

  if (!gross) return result;

  for (const [period, grossValue] of Object.entries(gross)) {
    const returnsValue = returns?.[period] ?? 0;
    result[period] = calculateNet(grossValue, returnsValue);
  }

  return result;
}

// ============================================
// DISPLAY FORMATTERS WITH SANITIZATION
// ============================================

/**
 * Format number for display with negative handling
 */
export function formatNumberSafe(
  value: number | null | undefined,
  options: {
    showNegative?: boolean;
    negativeFormat?: "parentheses" | "minus" | "zero";
  } = {},
): string {
  const { showNegative = true, negativeFormat = "minus" } = options;

  const sanitized = sanitizeNumber(value);

  if (sanitized < 0 && !showNegative) {
    if (negativeFormat === "zero") return "0";
    if (negativeFormat === "parentheses") {
      return `(${Math.abs(sanitized).toLocaleString("he-IL")})`;
    }
  }

  return sanitized.toLocaleString("he-IL");
}

/**
 * Format percentage with validation
 */
export function formatPercentSafe(
  value: number | null | undefined,
  options: {
    showSign?: boolean;
    decimals?: number;
  } = {},
): string {
  const { showSign = true, decimals = 1 } = options;

  const sanitized = sanitizePercentage(value);
  const sign = showSign && sanitized > 0 ? "+" : "";

  return `${sign}${sanitized.toFixed(decimals)}%`;
}

// ============================================
// DATA QUALITY INDICATOR
// ============================================

export type DataQuality = "good" | "warning" | "error";

/**
 * Get data quality indicator for a store
 */
export function getDataQuality(store: {
  monthly_qty?: Record<string, number>;
  metric_12v12?: number;
  returns_pct_last6?: number;
}): DataQuality {
  // Check for negative monthly values
  if (store.monthly_qty) {
    const hasNegative = Object.values(store.monthly_qty).some((v) => v < 0);
    if (hasNegative) return "warning";
  }

  // Check for extreme metrics
  if (store.metric_12v12 !== undefined) {
    if (Math.abs(store.metric_12v12) > 200) return "warning";
  }

  // Check for extreme returns
  if (store.returns_pct_last6 !== undefined) {
    if (store.returns_pct_last6 > 50) return "warning";
    if (store.returns_pct_last6 < 0) return "error";
  }

  return "good";
}

/**
 * Get data quality message
 */
export function getDataQualityMessage(quality: DataQuality): string {
  switch (quality) {
    case "error":
      return "נמצאו שגיאות בנתונים";
    case "warning":
      return "נמצאו ערכים חריגים";
    case "good":
      return "נתונים תקינים";
  }
}

// ============================================
// BATCH VALIDATION
// ============================================

/**
 * Validate array of stores and return summary
 */
export function validateStoresData(
  stores: Array<{
    id: number;
    name: string;
    monthly_qty?: Record<string, number>;
  }>,
): {
  totalStores: number;
  storesWithIssues: number;
  issues: Array<{
    storeId: number;
    storeName: string;
    issues: MonthlyDataIssue[];
  }>;
} {
  const allIssues: Array<{
    storeId: number;
    storeName: string;
    issues: MonthlyDataIssue[];
  }> = [];

  for (const store of stores) {
    const issues = validateMonthlyData(store.monthly_qty);
    if (issues.length > 0) {
      allIssues.push({
        storeId: store.id,
        storeName: store.name,
        issues,
      });
    }
  }

  return {
    totalStores: stores.length,
    storesWithIssues: allIssues.length,
    issues: allIssues,
  };
}
