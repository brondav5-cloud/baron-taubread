/**
 * Generic rolling pair window (current vs previous).
 * Same approach as buildRolling24Window: normalize, validate, sort, slice.
 */

import { normalizeMonths, sortMonths, isValidMonthKey } from "./monthKey";

export type RollingPairWindow = {
  size: number;
  current: string[];
  previous: string[];
};

/**
 * Builds a rolling pair window: current = last N months, previous = N months before that.
 * Uses exact JS slice behavior (no minimum enforcement).
 */
export function buildRollingPairWindow(
  periods: string[],
  size: number,
): RollingPairWindow {
  const normalized = normalizeMonths(periods);
  const valid = normalized.filter(isValidMonthKey);
  const sorted = sortMonths(valid);

  const current = sorted.slice(-size);
  const previous = sorted.slice(-(2 * size), -size);

  return {
    size,
    current,
    previous,
  };
}
