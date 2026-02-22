/**
 * Rolling 24-month window engine.
 * Pure functions that reproduce current JS slice behavior.
 */

import { normalizeMonths, sortMonths, isValidMonthKey } from "./monthKey";

export type Rolling24Window = {
  anchor: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  full24: string[];
  last12: string[];
  prev12: string[];
  sorted: string[];
};

/**
 * Builds a rolling 24-month window from detected months.
 * Uses exact JS slice behavior (no minimum 24 enforcement).
 */
export function buildRolling24Window(
  monthsDetected: string[],
): Rolling24Window {
  const normalized = normalizeMonths(monthsDetected);
  const valid = normalized.filter(isValidMonthKey);
  const sorted = sortMonths(valid);

  const last12 = sorted.slice(-12);
  const prev12 = sorted.slice(-24, -12);
  const full24 = sorted.slice(-24);

  const periodStart = full24[0] ?? null;
  const periodEnd = full24[full24.length - 1] ?? null;
  const anchor = periodEnd;

  return {
    anchor,
    periodStart,
    periodEnd,
    full24,
    last12,
    prev12,
    sorted,
  };
}
