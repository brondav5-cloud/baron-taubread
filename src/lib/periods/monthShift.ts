/**
 * Month key arithmetic (shift YYYYMM by N months).
 */

/**
 * Shifts a YYYYMM key by deltaMonths.
 * Handles year boundaries correctly.
 */
export function shiftMonthKeyYYYYMM(key: string, deltaMonths: number): string {
  const year = parseInt(key.slice(0, 4), 10);
  const month = parseInt(key.slice(4), 10); // 1-12
  const totalMonths = year * 12 + (month - 1);
  const newTotal = totalMonths + deltaMonths;
  const newYear = Math.floor(newTotal / 12);
  const newMonthIndex = ((newTotal % 12) + 12) % 12;
  const newMonth = newMonthIndex + 1;
  return `${newYear}${String(newMonth).padStart(2, "0")}`;
}
