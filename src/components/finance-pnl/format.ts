import { MONTH_NAMES } from "./constants";

export function fmtCurrency(value: number): string {
  const abs = Math.abs(value);
  return "₪" + abs.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtSignedCurrency(value: number): string {
  return value < 0 ? `-${fmtCurrency(value)}` : fmtCurrency(value);
}

export function monthLabel(ym: string): string {
  const [, monthPart] = ym.split("-");
  const monthIndex = Number(monthPart ?? "1") - 1;
  return MONTH_NAMES[monthIndex] ?? ym;
}

export function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}
