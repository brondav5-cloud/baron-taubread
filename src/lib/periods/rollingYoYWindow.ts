/**
 * Rolling YoY window (current vs same months previous year).
 */

import { normalizeMonths, sortMonths, isValidMonthKey } from "./monthKey";
import { shiftMonthKeyYYYYMM } from "./monthShift";

export type RollingYoYWindow = {
  size: number;
  current: string[];
  previousYear: string[];
};

/**
 * Builds a YoY window: current = last N months, previousYear = same N months one year ago.
 * Does not validate that previousYear months exist in data (sumMonths returns 0 for missing).
 */
export function buildRollingYoYWindow(
  periods: string[],
  size: number,
): RollingYoYWindow {
  const normalized = normalizeMonths(periods);
  const valid = normalized.filter(isValidMonthKey);
  const sorted = sortMonths(valid);

  const current = sorted.slice(-size);
  const previousYear = current.map((m) => shiftMonthKeyYYYYMM(m, -12));

  return {
    size,
    current,
    previousYear,
  };
}
