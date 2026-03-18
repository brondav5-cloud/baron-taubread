/**
 * Jewish holiday anchor dates for Israel (il:true), via @hebcal/core.
 * Used to build date ranges for Distribution V2 filters.
 */

import { HebrewCalendar } from "@hebcal/core";
import { addDays, endOfWeek, startOfWeek } from "date-fns";

export type HolidayWindowMode =
  | "week_of"
  | "week_before"
  | "week_after"
  | "days_before"
  | "days_after";

export interface HolidayDefinition {
  id: string;
  labelHe: string;
  /** Stable English desc from hebcal Event.getDesc() */
  matchDesc: (desc: string) => boolean;
}

/** Major retail-relevant chagim — anchor = first main day (Israel) */
export const HOLIDAY_DEFINITIONS: HolidayDefinition[] = [
  { id: "pesach", labelHe: "פסח (יום טוב ראשון)", matchDesc: (d) => d === "Pesach I" },
  { id: "shavuot", labelHe: "שבועות", matchDesc: (d) => d === "Shavuot" },
  {
    id: "rosh_hashana",
    labelHe: "ראש השנה (יום א׳)",
    matchDesc: (d) => /^Rosh Hashana \d{4}$/.test(d),
  },
  { id: "yom_kippur", labelHe: "יום כיפור", matchDesc: (d) => d === "Yom Kippur" },
  { id: "sukkot", labelHe: "סוכות (יום טוב ראשון)", matchDesc: (d) => d === "Sukkot I" },
  {
    id: "shmini_atzeret",
    labelHe: "שמיני עצרת / שמחת תורה",
    matchDesc: (d) => d === "Shmini Atzeret",
  },
  { id: "purim", labelHe: "פורים", matchDesc: (d) => d === "Purim" },
  { id: "chanukah", labelHe: "חנוכה (נר ראשון)", matchDesc: (d) => d === "Chanukah: 1 Candle" },
];

function stripTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Israeli-style week: Sunday (0) – Saturday */
function boundsIsraeliWeekContaining(date: Date): { from: Date; to: Date } {
  const start = startOfWeek(stripTime(date), { weekStartsOn: 0 });
  const to = endOfWeek(stripTime(date), { weekStartsOn: 0 });
  to.setHours(23, 59, 59, 999);
  return { from: start, to };
}

function prevIsraeliWeek(date: Date): { from: Date; to: Date } {
  const { from } = boundsIsraeliWeekContaining(date);
  const anyPrev = addDays(from, -1);
  return boundsIsraeliWeekContaining(anyPrev);
}

function nextIsraeliWeek(date: Date): { from: Date; to: Date } {
  const { to } = boundsIsraeliWeekContaining(date);
  const anyNext = addDays(to, 1);
  return boundsIsraeliWeekContaining(anyNext);
}

export function findHolidayAnchorGregorian(gregorianYear: number, def: HolidayDefinition): Date | null {
  const events = HebrewCalendar.calendar({ year: gregorianYear, il: true, numYears: 1 });
  for (const ev of events) {
    if (def.matchDesc(ev.getDesc())) {
      return stripTime(ev.greg());
    }
  }
  return null;
}

export function buildHolidayDateRange(
  anchor: Date,
  mode: HolidayWindowMode,
  dayCount: number,
): { from: Date; to: Date } {
  const n = Math.min(Math.max(Math.floor(dayCount), 1), 30);

  switch (mode) {
    case "week_of":
      return boundsIsraeliWeekContaining(anchor);
    case "week_before":
      return prevIsraeliWeek(anchor);
    case "week_after":
      return nextIsraeliWeek(anchor);
    case "days_before": {
      const to = addDays(anchor, -1);
      const from = addDays(anchor, -n);
      return { from: stripTime(from), to: stripTime(to) };
    }
    case "days_after": {
      const from = addDays(anchor, 1);
      const to = addDays(anchor, n);
      return { from: stripTime(from), to: stripTime(to) };
    }
    default:
      return boundsIsraeliWeekContaining(anchor);
  }
}

export function formatHebrewDateRange(from: Date, to: Date): string {
  const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric", year: "numeric" };
  return `${from.toLocaleDateString("he-IL", o)} – ${to.toLocaleDateString("he-IL", o)}`;
}
