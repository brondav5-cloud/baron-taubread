/**
 * Period Utilities
 * פונקציות עזר לעבודה עם תקופות (חודשים, רבעונים, חצאי שנה)
 */

// ============================================
// CONSTANTS
// ============================================

export const MONTH_NAMES_SHORT = [
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
export const MONTH_NAMES_FULL = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

// ============================================
// TYPES
// ============================================

export interface PeriodInfo {
  key: string; // "202401"
  year: number; // 2024
  month: number; // 1
  label: string; // "ינו 24"
  labelFull: string; // "ינואר 2024"
}

export interface MetricsPeriodLabels {
  yearly: string; // "ינו 25 - ינו 24" or "2025 vs 2024"
  halfYear: string; // "H2 vs H1 2025"
  quarter: string; // "נוב-ינו vs אוג-אוק"
  twoMonths: string; // "דצמ-ינו vs אוק-נוב"
}

// ============================================
// PARSING FUNCTIONS
// ============================================

/**
 * Parse period key to components
 * "202401" → { key: "202401", year: 2024, month: 1, label: "ינו 24" }
 */
export function parsePeriodKey(key: string): PeriodInfo | null {
  if (!key || key.length !== 6) return null;

  const year = parseInt(key.slice(0, 4), 10);
  const month = parseInt(key.slice(4, 6), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;

  const shortYear = String(year).slice(-2);
  const monthName = MONTH_NAMES_SHORT[month - 1] || "";
  const monthNameFull = MONTH_NAMES_FULL[month - 1] || "";

  return {
    key,
    year,
    month,
    label: `${monthName} ${shortYear}`,
    labelFull: `${monthNameFull} ${year}`,
  };
}

/**
 * Create period key from year and month
 * (2024, 1) → "202401"
 */
export function createPeriodKey(year: number, month: number): string {
  return `${year}${String(month).padStart(2, "0")}`;
}

// ============================================
// PERIOD CALCULATIONS
// ============================================

/**
 * Get all unique years from periods list
 */
export function getYearsFromPeriods(periods: string[]): number[] {
  const years = new Set<number>();
  periods.forEach((p) => {
    const year = parseInt(p.slice(0, 4), 10);
    if (!isNaN(year)) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a); // Descending
}

/**
 * Filter periods by year
 */
export function filterPeriodsByYear(periods: string[], year: number): string[] {
  return periods.filter((p) => p.startsWith(String(year)));
}

/**
 * Get last N periods from sorted list
 */
export function getLastNPeriods(periods: string[], n: number): string[] {
  const sorted = [...periods].sort();
  return sorted.slice(-n);
}

/**
 * Merge two period lists (for accumulating data)
 */
export function mergePeriodLists(
  existing: string[],
  newPeriods: string[],
): string[] {
  const merged = new Set([...existing, ...newPeriods]);
  return Array.from(merged).sort();
}

// ============================================
// METRICS PERIOD LABELS
// ============================================

/**
 * Generate labels for metrics headers based on the metrics period
 *
 * LOGIC:
 * - 12v12: Last 12 months vs Previous 12 months
 * - 6v6:   Last 6 months vs Previous 6 months (NOT H1 vs H2!)
 * - 3v3:   Last 3 months vs Same months previous year
 * - 2v2:   Last 2 months vs Previous 2 months
 */
export function generateMetricsPeriodLabels(
  metricsPeriods: string[],
): MetricsPeriodLabels {
  if (!metricsPeriods || metricsPeriods.length === 0) {
    return {
      yearly: "",
      halfYear: "",
      quarter: "",
      twoMonths: "",
    };
  }

  const sorted = [...metricsPeriods].sort();

  // Helper to format period range (e.g., "פבר25-ינו26")
  const formatRange = (periods: string[]): string => {
    if (periods.length === 0) return "";
    const start = parsePeriodKey(periods[0] || "");
    const end = parsePeriodKey(periods[periods.length - 1] || "");
    if (!start || !end) return "";
    if (periods.length === 1) return start.label;
    return `${start.label}-${end.label}`;
  };

  // Helper to get same months previous year
  const getSameMonthsPrevYear = (months: string[]): string[] => {
    return months.map((m) => {
      const year = parseInt(m.slice(0, 4), 10);
      const month = m.slice(4);
      return `${year - 1}${month}`;
    });
  };

  // 12v12: Last 12 vs Previous 12
  const last12 = sorted.slice(-12);
  const prev12 = sorted.slice(-24, -12);
  const yearly =
    prev12.length > 0
      ? `${formatRange(last12)} vs ${formatRange(prev12)}`
      : formatRange(last12);

  // 6v6: Last 6 vs Previous 6
  const last6 = sorted.slice(-6);
  const prev6 = sorted.slice(-12, -6);
  const halfYear =
    prev6.length > 0
      ? `${formatRange(last6)} vs ${formatRange(prev6)}`
      : formatRange(last6);

  // 3v3: Last 3 vs Same 3 months previous year
  const last3 = sorted.slice(-3);
  const same3PrevYear = getSameMonthsPrevYear(last3);
  const quarter = `${formatRange(last3)} vs ${formatRange(same3PrevYear)}`;

  // 2v2: Last 2 vs Previous 2
  const last2 = sorted.slice(-2);
  const prev2 = sorted.slice(-4, -2);
  const twoMonths =
    prev2.length > 0
      ? `${formatRange(last2)} vs ${formatRange(prev2)}`
      : formatRange(last2);

  return {
    yearly,
    halfYear,
    quarter,
    twoMonths,
  };
}

/**
 * Format period range for display
 * ("202402", "202601") → "פבר 24 - ינו 26"
 */
export function formatPeriodRange(startKey: string, endKey: string): string {
  const start = parsePeriodKey(startKey);
  const end = parsePeriodKey(endKey);

  if (!start || !end) return "";

  return `${start.label} - ${end.label}`;
}

// ============================================
// AVAILABLE PERIODS CALCULATION
// ============================================

export interface AvailablePeriods {
  years: { year: number; months: string[]; complete: boolean }[];
  halves: {
    key: string;
    year: number;
    half: 1 | 2;
    months: string[];
    label: string;
  }[];
  quarters: {
    key: string;
    year: number;
    quarter: 1 | 2 | 3 | 4;
    months: string[];
    label: string;
  }[];
  months: PeriodInfo[];
}

/**
 * Calculate all available period groupings from months_list
 * Used for the smart period selector
 */
export function calculateAvailablePeriods(
  monthsList: string[],
): AvailablePeriods {
  if (!monthsList || monthsList.length === 0) {
    return { years: [], halves: [], quarters: [], months: [] };
  }

  const sorted = [...monthsList].sort();
  const years = getYearsFromPeriods(sorted);

  // Years
  const yearsData = years.map((year) => {
    const yearMonths = filterPeriodsByYear(sorted, year);
    return {
      year,
      months: yearMonths,
      complete: yearMonths.length === 12,
    };
  });

  // Halves
  const halvesData: AvailablePeriods["halves"] = [];
  years.forEach((year) => {
    const yearMonths = filterPeriodsByYear(sorted, year);

    // H1 (months 1-6)
    const h1Months = yearMonths.filter((p) => parseInt(p.slice(4), 10) <= 6);
    if (h1Months.length > 0) {
      halvesData.push({
        key: `${year}-H1`,
        year,
        half: 1,
        months: h1Months,
        label: `H1 ${year}`,
      });
    }

    // H2 (months 7-12)
    const h2Months = yearMonths.filter((p) => parseInt(p.slice(4), 10) > 6);
    if (h2Months.length > 0) {
      halvesData.push({
        key: `${year}-H2`,
        year,
        half: 2,
        months: h2Months,
        label: `H2 ${year}`,
      });
    }
  });

  // Quarters
  const quartersData: AvailablePeriods["quarters"] = [];
  years.forEach((year) => {
    const yearMonths = filterPeriodsByYear(sorted, year);

    [1, 2, 3, 4].forEach((q) => {
      const qStart = (q - 1) * 3 + 1;
      const qEnd = q * 3;
      const qMonths = yearMonths.filter((p) => {
        const month = parseInt(p.slice(4), 10);
        return month >= qStart && month <= qEnd;
      });

      if (qMonths.length > 0) {
        quartersData.push({
          key: `${year}-Q${q}`,
          year,
          quarter: q as 1 | 2 | 3 | 4,
          months: qMonths,
          label: `Q${q} ${year}`,
        });
      }
    });
  });

  // Individual months
  const monthsData: PeriodInfo[] = sorted
    .map((key) => parsePeriodKey(key))
    .filter((p): p is PeriodInfo => p !== null);

  return {
    years: yearsData,
    halves: halvesData.sort((a, b) => b.key.localeCompare(a.key)), // Newest first
    quarters: quartersData.sort((a, b) => b.key.localeCompare(a.key)),
    months: monthsData.reverse(), // Newest first
  };
}
