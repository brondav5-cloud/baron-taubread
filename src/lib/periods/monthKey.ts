/**
 * Month key utilities. Accepts YYYYMM or YYYY-MM, returns canonical YYYYMM.
 */

/** YYYY-MM with month 01-12 */
const DASH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
/** YYYYMM with month 01-12 */
const COMPACT_REGEX = /^\d{6}$/;

export function isValidMonthKey(m: string): boolean {
  const t = m.trim();
  if (DASH_REGEX.test(t)) return true;
  if (COMPACT_REGEX.test(t)) {
    const month = t.slice(4);
    return month >= "01" && month <= "12";
  }
  return false;
}

/** Canonicalize to YYYYMM (trim, YYYY-MM → YYYYMM), then dedupe */
export function normalizeMonths(months: string[]): string[] {
  const canonical = (s: string) => {
    const t = s.trim();
    const m = t.match(/^(\d{4})-(\d{1,2})$/);
    const y = m?.[1];
    const mo = m?.[2];
    return y != null && mo != null ? `${y}${mo.padStart(2, "0")}` : t;
  };
  return Array.from(new Set(months.map(canonical)));
}

export function sortMonths(months: string[]): string[] {
  return [...months].sort();
}
