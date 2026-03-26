export interface SupplierPayment {
  date: string; // ISO: YYYY-MM-DD
  amount: number;
}

export interface InsightParams {
  payments: SupplierPayment[];
  yearTotal: number;
  totalCompanyExpenses: number;
  trendPct: number | null;
  selectedYear: number;
}

export function computeInsights({
  payments,
  yearTotal,
  totalCompanyExpenses,
  trendPct,
  selectedYear,
}: InsightParams): string[] {
  const insights: string[] = [];

  // % of total company expenses
  if (totalCompanyExpenses > 0 && yearTotal > 0) {
    const pct = (yearTotal / totalCompanyExpenses) * 100;
    if (pct >= 20) {
      insights.push(`ספק זה מהווה ${pct.toFixed(0)}% מסך הוצאות החברה — תלות גבוהה מאוד`);
    } else if (pct >= 10) {
      insights.push(`ספק זה מהווה ${pct.toFixed(0)}% מסך הוצאות החברה — תלות גבוהה`);
    } else if (pct >= 3) {
      insights.push(`ספק זה מהווה ${pct.toFixed(0)}% מסך הוצאות החברה`);
    }
  }

  // Year-over-year trend
  if (trendPct !== null) {
    if (trendPct > 20) {
      insights.push(`עלייה חדה של ${trendPct.toFixed(0)}% לעומת אשתקד — יש לבחון`);
    } else if (trendPct > 5) {
      insights.push(`עלייה של ${trendPct.toFixed(0)}% לעומת אשתקד`);
    } else if (trendPct < -10) {
      insights.push(`ירידה של ${Math.abs(trendPct).toFixed(0)}% לעומת אשתקד`);
    }
  }

  // Consecutive months without payment (counting back from current month in selected year)
  const yearPayments = payments.filter((p) => new Date(p.date).getFullYear() === selectedYear);
  if (yearPayments.length > 0) {
    const monthsWithPayment = new Set(yearPayments.map((p) => new Date(p.date).getMonth()));
    const maxMonth =
      new Date().getFullYear() === selectedYear ? new Date().getMonth() : 11;
    let gapFromNow = 0;
    for (let m = maxMonth; m >= 0; m--) {
      if (!monthsWithPayment.has(m)) gapFromNow++;
      else break;
    }
    if (gapFromNow >= 3) {
      insights.push(`לא שולם ${gapFromNow} חודשים ברציפות — חריג`);
    }
  }

  // Payment day-of-month pattern (only when enough data)
  if (payments.length >= 4) {
    const days = payments.map((p) => new Date(p.date).getDate());
    const avg = days.reduce((s, d) => s + d, 0) / days.length;
    const variance = days.reduce((s, d) => s + (d - avg) ** 2, 0) / days.length;
    if (variance < 36) {
      if (avg <= 8) insights.push("בדרך כלל שולם בתחילת החודש");
      else if (avg >= 22) insights.push("בדרך כלל שולם בסוף החודש");
      else insights.push(`בדרך כלל שולם בסביבות ה-${Math.round(avg)} לחודש`);
    }
  }

  return insights;
}
