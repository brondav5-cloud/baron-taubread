"use client";

import { useMemo } from "react";

export interface CalendarPayment {
  date: string;  // ISO: YYYY-MM-DD
  amount: number;
}

interface Props {
  payments: CalendarPayment[];
  year: number;
  accentColor?: string;
}

const MONTH_LABELS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const DOW_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SupplierPaymentCalendar({
  payments,
  year,
  accentColor = "#3b82f6",
}: Props) {
  // Map of "YYYY-MM-DD" → total amount paid that day
  const paymentMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      if (new Date(p.date).getFullYear() !== year) continue;
      map.set(p.date, (map.get(p.date) ?? 0) + p.amount);
    }
    return map;
  }, [payments, year]);

  const maxDayAmount = useMemo(() => {
    let max = 0;
    paymentMap.forEach((v) => { if (v > max) max = v; });
    return max;
  }, [paymentMap]);

  const totalPaid = useMemo(() => {
    let t = 0;
    paymentMap.forEach((v) => { t += v; });
    return t;
  }, [paymentMap]);

  return (
    <div>
      {totalPaid > 0 ? (
        <p className="text-xs text-gray-500 mb-4 text-center">
          {paymentMap.size} ימי תשלום בשנה זו · סה״כ {fmtCurrency(totalPaid)}
        </p>
      ) : (
        <p className="text-xs text-gray-400 mb-4 text-center">אין תשלומים בשנה זו</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {MONTH_LABELS.map((monthLabel, monthIdx) => {
          const firstDow = new Date(year, monthIdx, 1).getDay(); // 0=Sun
          const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

          const cells: (number | null)[] = Array.from({ length: firstDow }, () => null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          const monthTotal = Array.from(paymentMap.entries())
            .filter(([k]) => new Date(k).getMonth() === monthIdx)
            .reduce((s, [, v]) => s + v, 0);

          return (
            <div
              key={monthIdx}
              className={`border rounded-xl p-3 ${
                monthTotal > 0
                  ? "bg-white border-gray-200"
                  : "bg-gray-50 border-gray-100 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-700">{monthLabel}</p>
                {monthTotal > 0 && (
                  <p className="text-[10px] font-semibold" style={{ color: accentColor }}>
                    {fmtCurrency(monthTotal)}
                  </p>
                )}
              </div>

              {/* Day-of-week header */}
              <div className="grid grid-cols-7 gap-px mb-0.5">
                {DOW_LABELS.map((d) => (
                  <div key={d} className="text-[7px] text-gray-400 text-center font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-px">
                {cells.map((day, ci) => {
                  if (!day) return <div key={`e-${ci}`} className="aspect-square" />;
                  const dateStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const amount = paymentMap.get(dateStr);
                  const intensity = amount && maxDayAmount > 0
                    ? Math.max(0.22, amount / maxDayAmount)
                    : 0;

                  return (
                    <div
                      key={ci}
                      title={amount ? `${day}/${monthIdx + 1}: ${fmtCurrency(amount)}` : undefined}
                      className="aspect-square flex items-center justify-center rounded-sm text-[8px] font-medium relative overflow-hidden"
                    >
                      {amount && (
                        <div
                          className="absolute inset-0 rounded-sm"
                          style={{ backgroundColor: accentColor, opacity: intensity }}
                        />
                      )}
                      <span
                        className="relative z-10 leading-none"
                        style={{
                          color: amount
                            ? intensity > 0.55 ? "white" : accentColor
                            : "#e5e7eb",
                        }}
                      >
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
